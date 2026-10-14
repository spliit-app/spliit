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
import { fillStable, money, setChecked } from './ui'

test('edits an expense and recomputes balances', async ({ page }) => {
  const groupId = await createGroup(page, {
    name: `E2E Edit ${uniqueSuffix()}`,
    participants: ['Alice', 'Bob', 'Carol'],
  })

  await addExpense(page, groupId, {
    title: 'Groceries',
    amount: '60',
    paidBy: 'Alice',
  })

  await openExpense(page, 'Groceries')

  // The form must arrive pre-filled with what we created.
  await expect(page.locator('input[name="title"]')).toHaveValue('Groceries')
  await expect(page.locator('input[name="amount"]')).toHaveValue(/^60/)
  await expect(page.getByTestId('paid-by')).toContainText('Alice')
  for (const name of ['Alice', 'Bob', 'Carol']) {
    await expect(paidForRow(page, name).getByRole('checkbox')).toHaveAttribute(
      'aria-checked',
      'true',
    )
  }

  await fillStable(page.locator('input[name="title"]'), 'Groceries and wine')
  await fillStable(page.locator('input[name="amount"]'), '90')
  await setChecked(paidForRow(page, 'Carol').getByRole('checkbox'), false)

  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page.waitForURL(EXPENSES_URL, { timeout: 30_000 })

  const card = page
    .getByTestId('expense-card')
    .filter({ hasText: 'Groceries and wine' })
  await expect(card).toContainText(money(90))
  await expect(card).toContainText('Paid by Alice for Alice, Bob')

  // 90 split between Alice and Bob only.
  await openTab(page, 'Balances')
  await expectBalance(page, 'Alice', 45)
  await expectBalance(page, 'Bob', -45)
  await expectBalance(page, 'Carol', 0)
})

test('deletes an expense and clears the balances', async ({ page }) => {
  const groupId = await createGroup(page, {
    name: `E2E Delete ${uniqueSuffix()}`,
    participants: ['Alice', 'Bob', 'Carol'],
  })

  await addExpense(page, groupId, {
    title: 'Museum',
    amount: '60',
    paidBy: 'Alice',
  })

  await openTab(page, 'Balances')
  await expectBalance(page, 'Alice', 40)

  await openTab(page, 'Expenses')
  await openExpense(page, 'Museum')

  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Delete this expense?')
  await dialog.getByRole('button', { name: 'Yes', exact: true }).click()

  await page.waitForURL(EXPENSES_URL, { timeout: 30_000 })
  await expect(page.getByTestId('expense-card')).toHaveCount(0)
  await expect(page.getByText(/doesn.t contain any expense yet/)).toBeVisible()

  await openTab(page, 'Balances')
  await expectBalance(page, 'Alice', 0)
  await expectBalance(page, 'Bob', 0)
  await expectBalance(page, 'Carol', 0)
  await expect(page.getByText(/doesn.t need any reimbursement/)).toBeVisible()
})
