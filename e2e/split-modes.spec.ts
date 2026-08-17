import {
  addExpense,
  createGroup,
  expectBalance,
  openTab,
  paidForRow,
  uniqueSuffix,
} from './app'
import { expect, test } from './fixtures'
import { fillStable, selectRadixOption } from './ui'

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
    page.getByText('Sum of percentages must equal 100.'),
  ).toBeVisible()
  await expect(page).toHaveURL(/\/expenses\/create/)
})
