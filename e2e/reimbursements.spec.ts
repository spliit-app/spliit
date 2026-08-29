import {
  addExpense,
  createGroup,
  expectBalance,
  EXPENSES_URL,
  openTab,
  paidForRow,
  reimbursementRow,
  uniqueSuffix,
} from './app'
import { expect, test } from './fixtures'
import { money } from './ui'

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

  await openTab(page, 'Balances')
  await expectBalance(page, 'Alice', 0)
  await expectBalance(page, 'Bob', 0)
  await expect(page.getByText(/doesn.t need any reimbursement/)).toBeVisible()
})
