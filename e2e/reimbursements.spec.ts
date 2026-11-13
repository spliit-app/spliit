import {
  addExpense,
  createGroup,
  expectBalance,
  EXPENSES_URL,
  openExpense,
  openTab,
  paidForRow,
  reimbursementRow,
  uniqueSuffix,
} from './app'
import { expect, test } from './fixtures'
import { money, selectRadixOption } from './ui'

test('settles a debt through "Mark as paid"', async ({ page }) => {
  // Two participants, so the suggested reimbursement is unique and deterministic.
  const groupId = await createGroup(page, {
    name: `E2E Reimbursement ${uniqueSuffix()}`,
    participants: ['Alice', 'Bob'],
  })

  await addExpense(page, groupId, {
    title: 'Hotel',
    amount: '100',
    paidBy: 'Alice',
  })

  // A previously saved unequal default must not affect a suggested repayment.
  await page.evaluate((id) => {
    localStorage.setItem(
      `${id}-defaultSplittingOptions`,
      JSON.stringify({ splitMode: 'BY_AMOUNT', paidFor: null }),
    )
  }, groupId)

  await openTab(page, 'Balances')
  await expectBalance(page, 'Alice', 50)
  await expectBalance(page, 'Bob', -50)

  const row = reimbursementRow(page, 'Bob', 'Alice')
  await expect(row).toContainText('Bob owes Alice')
  await expect(row).toContainText(money(50))

  await row.getByRole('link', { name: 'Mark as paid' }).click()
  await page.waitForURL(/\/expenses\/create\?.*reimbursement=yes/, {
    timeout: 30_000,
  })

  // The link prefills the whole form from its query string.
  await expect(page.locator('input[name="title"]')).toHaveValue('Reimbursement')
  await expect(page.locator('input[name="amount"]')).toHaveValue(/^50/)
  await expect(page.getByTestId('paid-by')).toContainText('Bob')
  await page.getByRole('button', { name: /Advanced splitting options/ }).click()
  await expect(page.getByTestId('split-mode')).toHaveText('Evenly')
  await expect(paidForRow(page, 'Alice').getByRole('checkbox')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(paidForRow(page, 'Bob').getByRole('checkbox')).toHaveAttribute(
    'aria-checked',
    'false',
  )

  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await page.waitForURL(EXPENSES_URL, { timeout: 30_000 })

  await expect(
    page.getByTestId('expense-card').filter({ hasText: 'Reimbursement' }),
  ).toBeVisible()

  // A repayment must not overwrite the browser's default for regular expenses.
  const savedDefault = await page.evaluate(
    (id) => localStorage.getItem(`${id}-defaultSplittingOptions`),
    groupId,
  )
  expect(JSON.parse(savedDefault!)).toEqual({
    splitMode: 'BY_AMOUNT',
    paidFor: null,
  })

  // Existing reimbursements retain their own saved split mode when edited.
  await openExpense(page, 'Reimbursement')
  await page.getByRole('button', { name: /Advanced splitting options/ }).click()
  await selectRadixOption(page, page.getByTestId('split-mode'), /By shares/)
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page.waitForURL(EXPENSES_URL, { timeout: 30_000 })
  await openExpense(page, 'Reimbursement')
  await expect(page.getByTestId('split-mode')).toHaveText(/By shares/)
  await page.goto(`/groups/${groupId}/expenses`)

  await openTab(page, 'Balances')
  await expectBalance(page, 'Alice', 0)
  await expectBalance(page, 'Bob', 0)
  await expect(page.getByText(/doesn.t need any reimbursement/)).toBeVisible()
})
