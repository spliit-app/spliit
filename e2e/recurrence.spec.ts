import {
  addExpense,
  createGroup,
  daysAgo,
  expenseCard,
  EXPENSES_URL,
  openExpense,
  uniqueSuffix,
} from './app'
import { expect, test } from './fixtures'
import { fieldByLabel, selectRadixOption } from './ui'

const PARTICIPANTS = ['Alice', 'Bob']

test('round-trips a recurrence rule through the form', async ({ page }) => {
  const groupId = await createGroup(page, {
    name: `E2E Recurrence ${uniqueSuffix()}`,
    participants: PARTICIPANTS,
  })

  await addExpense(page, groupId, {
    title: 'Netflix',
    amount: '20',
    paidBy: 'Alice',
    recurrence: 'Monthly',
  })

  await openExpense(page, 'Netflix')
  const field = fieldByLabel(page, 'Expense Recurrence').getByRole('combobox')
  await expect(field).toContainText('Monthly')

  // Turning a recurring expense back off is a distinct branch in
  // src/lib/api.ts, so assert the transition persists.
  await selectRadixOption(page, field, 'None')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page.waitForURL(EXPENSES_URL, { timeout: 30_000 })

  await openExpense(page, 'Netflix')
  await expect(
    fieldByLabel(page, 'Expense Recurrence').getByRole('combobox'),
  ).toContainText('None')
})

test('materialises past occurrences of a daily expense', async ({ page }) => {
  const groupId = await createGroup(page, {
    name: `E2E Daily ${uniqueSuffix()}`,
    participants: PARTICIPANTS,
  })

  // getGroupExpenses() calls createRecurringExpenses() on every read, which
  // fills in every occurrence whose date has already passed. Backdating by
  // three days should therefore yield the original plus one per elapsed day.
  await addExpense(page, groupId, {
    title: 'Coffee',
    amount: '5',
    paidBy: 'Alice',
    recurrence: 'Daily',
    date: daysAgo(3),
  })

  await page.goto(`/groups/${groupId}/expenses`)

  // Asserted as a floor rather than an exact count: the backfill depends on
  // the wall clock, and a run spanning midnight UTC would produce one more.
  await expect
    .poll(async () => await expenseCard(page, 'Coffee').count(), {
      timeout: 20_000,
    })
    .toBeGreaterThanOrEqual(4)
})
