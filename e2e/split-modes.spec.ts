import {
  addExpense,
  createGroup,
  expectBalance,
  EXPENSES_URL,
  openExpense,
  openTab,
  paidForRow,
  uniqueSuffix,
} from './app'
import { expect, test } from './fixtures'
import { fillStable, money, selectRadixOption } from './ui'

const PARTICIPANTS = ['Alice', 'Bob', 'Carol']

test('splits an expense by shares', async ({ page }) => {
  const groupId = await createGroup(page, {
    name: `E2E Shares ${uniqueSuffix()}`,
    participants: PARTICIPANTS,
  })

  // 100 over 2/1/1 shares: Alice owes 50, Bob and Carol 25 each.
  await addExpense(page, groupId, {
    title: 'Rent',
    amount: '100',
    paidBy: 'Alice',
    splitMode: 'BY_SHARES',
    shares: { Alice: '2', Bob: '1', Carol: '1' },
  })

  await openTab(page, 'Balances')
  await expectBalance(page, 'Alice', 50)
  await expectBalance(page, 'Bob', -25)
  await expectBalance(page, 'Carol', -25)
})

test('splits an expense by percentage', async ({ page }) => {
  const groupId = await createGroup(page, {
    name: `E2E Percentage ${uniqueSuffix()}`,
    participants: PARTICIPANTS,
  })

  await addExpense(page, groupId, {
    title: 'Villa',
    amount: '100',
    paidBy: 'Alice',
    splitMode: 'BY_PERCENTAGE',
    shares: { Alice: '50', Bob: '30', Carol: '20' },
  })

  await openTab(page, 'Balances')
  await expectBalance(page, 'Alice', 50)
  await expectBalance(page, 'Bob', -30)
  await expectBalance(page, 'Carol', -20)
})

test('splits an expense by amount', async ({ page }) => {
  const groupId = await createGroup(page, {
    name: `E2E Amount ${uniqueSuffix()}`,
    participants: PARTICIPANTS,
  })

  await addExpense(page, groupId, {
    title: 'Flights',
    amount: '100',
    paidBy: 'Alice',
    splitMode: 'BY_AMOUNT',
    shares: { Alice: '50', Bob: '30', Carol: '20' },
  })

  await openTab(page, 'Balances')
  await expectBalance(page, 'Alice', 50)
  await expectBalance(page, 'Bob', -30)
  await expectBalance(page, 'Carol', -20)
})

test('keeps a by-amount split that skips a participant when reopened', async ({
  page,
}) => {
  const groupId = await createGroup(page, {
    name: `E2E AmountReopen ${uniqueSuffix()}`,
    participants: PARTICIPANTS,
  })

  // Regression for #621: with a participant left unchecked, the edit form
  // used to rebalance the stored amounts evenly as soon as it loaded.
  await addExpense(page, groupId, {
    title: 'Taxi',
    amount: '100',
    paidBy: 'Alice',
    paidFor: ['Alice', 'Bob'],
    splitMode: 'BY_AMOUNT',
    shares: { Alice: '60', Bob: '40' },
  })

  await openExpense(page, 'Taxi')
  await expect(paidForRow(page, 'Alice').getByRole('textbox')).toHaveValue('60')
  await expect(paidForRow(page, 'Bob').getByRole('textbox')).toHaveValue('40')
  await expect(paidForRow(page, 'Carol').getByRole('checkbox')).toHaveAttribute(
    'aria-checked',
    'false',
  )

  // Saving without touching the split must not change it either.
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page.waitForURL(EXPENSES_URL, { timeout: 30_000 })

  await openTab(page, 'Balances')
  await expectBalance(page, 'Alice', 40)
  await expectBalance(page, 'Bob', -40)
  await expectBalance(page, 'Carol', 0)
})

test('rejects percentages that do not add up to 100', async ({ page }) => {
  const groupId = await createGroup(page, {
    name: `E2E BadPercent ${uniqueSuffix()}`,
    participants: PARTICIPANTS,
  })

  // Driven inline rather than through addExpense, which waits for a successful
  // navigation -- the whole point here is that submitting must not navigate.
  await page.goto(`/groups/${groupId}/expenses/create`)
  const submit = page.getByRole('button', { name: 'Create', exact: true })
  await expect(submit).toBeVisible({ timeout: 30_000 })

  await fillStable(page.locator('input[name="title"]'), 'Invalid')
  await fillStable(page.locator('input[name="amount"]'), '100')
  await selectRadixOption(page, page.getByTestId('paid-by'), 'Alice')
  await page.getByRole('button', { name: /Advanced splitting options/ }).click()
  await selectRadixOption(page, page.getByTestId('split-mode'), /By percentage/)

  const shares: Record<string, string> = { Alice: '50', Bob: '30', Carol: '10' }
  for (const name of Object.keys(shares)) {
    await fillStable(paidForRow(page, name).getByRole('textbox'), shares[name])
  }

  await submit.click()

  await expect(
    page.getByText('The percentages add up to 90%, 10% less than 100%.'),
  ).toBeVisible()
  await expect(page).toHaveURL(/\/expenses\/create/)
})

test('names the difference when amounts do not add up', async ({ page }) => {
  const groupId = await createGroup(page, {
    name: `E2E BadAmount ${uniqueSuffix()}`,
    participants: PARTICIPANTS,
  })

  await page.goto(`/groups/${groupId}/expenses/create`)
  const submit = page.getByRole('button', { name: 'Create', exact: true })
  await expect(submit).toBeVisible({ timeout: 30_000 })

  await fillStable(page.locator('input[name="title"]'), 'Off by a cent')
  await fillStable(page.locator('input[name="amount"]'), '100')
  await selectRadixOption(page, page.getByTestId('paid-by'), 'Alice')
  await page.getByRole('button', { name: /Advanced splitting options/ }).click()
  await selectRadixOption(page, page.getByTestId('split-mode'), /By amount/)

  // Receipt rounding: the last amount is one cent too high.
  const shares: Record<string, string> = {
    Alice: '50',
    Bob: '30',
    Carol: '20.01',
  }
  for (const name of Object.keys(shares)) {
    await fillStable(paidForRow(page, name).getByRole('textbox'), shares[name])
  }

  await submit.click()

  const message = page.getByText(
    `The amounts add up to ${money(100.01)}, ${money(0.01)} more than the expense amount (${money(100)}).`,
  )
  await expect(message).toBeVisible()
  await expect(page).toHaveURL(/\/expenses\/create/)

  // The error is about amounts; it must not outlive the split mode.
  await selectRadixOption(page, page.getByTestId('split-mode'), /Evenly/)
  await expect(message).toBeHidden()
  await expect(page.getByText(/SchemaErrors/)).toHaveCount(0)
})

test('offers the remainder again when an amount is cleared', async ({
  page,
}) => {
  const groupId = await createGroup(page, {
    name: `E2E ClearAmount ${uniqueSuffix()}`,
    participants: PARTICIPANTS,
  })

  await page.goto(`/groups/${groupId}/expenses/create`)
  const submit = page.getByRole('button', { name: 'Create', exact: true })
  await expect(submit).toBeVisible({ timeout: 30_000 })

  await fillStable(page.locator('input[name="title"]'), 'Cleared')
  await fillStable(page.locator('input[name="amount"]'), '100')
  await selectRadixOption(page, page.getByTestId('paid-by'), 'Alice')
  await page.getByRole('button', { name: /Advanced splitting options/ }).click()
  await selectRadixOption(page, page.getByTestId('split-mode'), /By amount/)

  await fillStable(paidForRow(page, 'Alice').getByRole('textbox'), '50')
  await fillStable(paidForRow(page, 'Bob').getByRole('textbox'), '30')
  // Carol's amount was filled in; type a wrong one, then delete it. The input
  // must go back to suggesting the remainder, as a placeholder this time.
  const carol = paidForRow(page, 'Carol').getByRole('textbox')
  await fillStable(carol, '25')
  await fillStable(carol, '')
  await expect(carol).toHaveAttribute('placeholder', '20.00')

  // The suggestion is what gets saved when the input is left empty.
  await submit.click()
  await page.waitForURL(/\/groups\/[^/]+\/expenses(\?|$)/, { timeout: 30_000 })
  await openTab(page, 'Balances')
  await expectBalance(page, 'Alice', 50)
  await expectBalance(page, 'Bob', -30)
  await expectBalance(page, 'Carol', -20)
})
