import {
  addExpense,
  createGroup,
  daysAgo,
  expectBalance,
  openTab,
  reimbursementRow,
  setActiveUser,
  uniqueSuffix,
} from './app'
import { expect, test } from './fixtures'
import { money } from './ui'

/**
 * Settle-ups: a suggested reimbursement turned into a promise with a deadline,
 * the in-app reminder that follows from it, and the reimbursement that settles
 * it.
 */
test.describe('settle-ups', () => {
  test('reminds about an overdue settle-up and settles it', async ({
    page,
  }) => {
    const groupId = await createGroup(page, {
      name: `E2E Settle-up ${uniqueSuffix()}`,
      participants: ['Alice', 'Bob'],
    })

    // Alice pays 100 for both: Bob owes Alice 50.
    await addExpense(page, groupId, {
      title: 'Hotel',
      amount: '100',
      paidBy: 'Alice',
    })

    // Bob is the one who owes, so the reminder is addressed to him.
    await setActiveUser(page, groupId, 'Bob')
    await openTab(page, 'Balances')

    const suggestion = reimbursementRow(page, 'Bob', 'Alice')
    await expect(suggestion).toContainText('Bob owes Alice')

    await suggestion.getByRole('button', { name: 'Ask to settle by' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    // Yesterday, so the reminder is immediately overdue instead of depending on
    // the wall clock crossing a deadline during the run.
    await dialog.locator('input[type="date"]').fill(daysAgo(1))
    await dialog.getByRole('button', { name: 'Send settle-up request' }).click()
    await expect(dialog).toBeHidden()

    const card = page.getByTestId('payment-dues-card')
    const dueRow = card.getByTestId('payment-due-row').first()
    await expect(dueRow).toHaveAttribute('data-status', 'PENDING')
    await expect(dueRow).toContainText('You owe Alice')
    await expect(dueRow).toContainText(money(50))
    await expect(dueRow).toContainText('1 day late')
    // The badge counts what is late or due today, not every obligation.
    await expect(card.getByTestId('payment-due-overdue-badge')).toHaveText('1')

    // Settling creates the ordinary reimbursement expense the ledger knows.
    await dueRow.getByRole('button', { name: 'Mark as paid' }).click()
    await expect(dueRow).toHaveAttribute('data-status', 'SETTLED')
    await expect(dueRow).toContainText('Paid')
    await expect(card.getByTestId('payment-due-overdue-badge')).toHaveCount(0)

    await expectBalance(page, 'Alice', 0)
    await expectBalance(page, 'Bob', 0)
    await expect(page.getByText(/doesn.t need any reimbursement/)).toBeVisible()

    // The settlement is a normal expense, so it is in the ledger too.
    await openTab(page, 'Expenses')
    await expect(
      page.getByTestId('expense-card').filter({ hasText: 'Reimbursement' }),
    ).toBeVisible()
  })

  test('cancels a settle-up and flags one the balances moved under', async ({
    page,
  }) => {
    const groupId = await createGroup(page, {
      name: `E2E Settle-up cancel ${uniqueSuffix()}`,
      participants: ['Alice', 'Bob'],
    })
    await addExpense(page, groupId, {
      title: 'Dinner',
      amount: '60',
      paidBy: 'Alice',
    })
    await setActiveUser(page, groupId, 'Bob')
    await openTab(page, 'Balances')

    const suggestion = reimbursementRow(page, 'Bob', 'Alice')
    await suggestion.getByRole('button', { name: 'Ask to settle by' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.locator('input[type="date"]').fill(daysAgo(-1)) // tomorrow
    await dialog.getByRole('button', { name: 'Send settle-up request' }).click()
    await expect(dialog).toBeHidden()

    const card = page.getByTestId('payment-dues-card')
    const dueRow = card.getByTestId('payment-due-row').first()
    await expect(dueRow).toHaveAttribute('data-status', 'PENDING')
    // Not late yet, so nothing to count.
    await expect(card.getByTestId('payment-due-overdue-badge')).toHaveCount(0)

    await dueRow.getByRole('button', { name: 'Cancel request' }).click()
    await expect(dueRow).toHaveAttribute('data-status', 'CANCELLED')
    await expect(dueRow).toContainText('Cancelled')

    // A new obligation, then an expense that changes the split: the amount is a
    // snapshot, so it is reported as outdated rather than presented as current.
    await suggestion.getByRole('button', { name: 'Ask to settle by' }).click()
    await dialog.locator('input[type="date"]').fill(daysAgo(-1))
    await dialog.getByRole('button', { name: 'Send settle-up request' }).click()
    await expect(dialog).toBeHidden()

    await addExpense(page, groupId, {
      title: 'Taxi',
      amount: '20',
      paidBy: 'Alice',
      paidFor: ['Bob'],
    })
    await openTab(page, 'Balances')

    const moved = page
      .getByTestId('payment-dues-card')
      .getByTestId('payment-due-row')
    await expect(
      moved.filter({ hasText: 'Outdated: the balances changed' }),
    ).toHaveCount(1)
  })
})
