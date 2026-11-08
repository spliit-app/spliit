import {
  addExpense,
  createGroup,
  daysAgo,
  expenseCard,
  EXPENSES_URL,
  openExpense,
  openTab,
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

test('lists and stops a recurring expense from the Recurring tab', async ({
  page,
}) => {
  const groupId = await createGroup(page, {
    name: `E2E Recurring tab ${uniqueSuffix()}`,
    participants: PARTICIPANTS,
  })

  await addExpense(page, groupId, {
    title: 'Netflix',
    amount: '20',
    paidBy: 'Alice',
    recurrence: 'Monthly',
  })

  await openTab(page, 'Recurring')
  const series = page.getByTestId('recurring-series').filter({
    hasText: 'Netflix',
  })
  await expect(series).toContainText('Monthly')

  await series.click()
  await page.getByRole('button', { name: 'Stop recurring' }).click()
  await page.getByRole('button', { name: 'Stop', exact: true }).click()
  await page.waitForURL(/\/recurring$/, { timeout: 30_000 })

  await expect(
    page.getByText('There are no recurring expenses in this group.'),
  ).toBeVisible()

  // Stopping only ends the series: the expense itself is kept.
  await page.goto(`/groups/${groupId}/expenses`)
  await expect(expenseCard(page, 'Netflix')).toHaveCount(1)
})

test('shows the occurrences of a series in its history', async ({ page }) => {
  const groupId = await createGroup(page, {
    name: `E2E Recurring history ${uniqueSuffix()}`,
    participants: PARTICIPANTS,
  })

  await addExpense(page, groupId, {
    title: 'Coffee',
    amount: '5',
    paidBy: 'Alice',
    recurrence: 'Daily',
    date: daysAgo(3),
  })

  await page.goto(`/groups/${groupId}/recurring`)
  await page
    .getByTestId('recurring-series')
    .filter({ hasText: 'Coffee' })
    .click()

  // A floor, as in the daily test above: a run spanning midnight UTC adds one.
  await expect
    .poll(async () => await page.getByTestId('recurring-occurrence').count(), {
      timeout: 20_000,
    })
    .toBeGreaterThanOrEqual(4)
})

test('recovers when a stale page stops a series that is already stopped', async ({
  page,
}) => {
  const groupId = await createGroup(page, {
    name: `E2E Recurring stale ${uniqueSuffix()}`,
    participants: PARTICIPANTS,
  })

  await addExpense(page, groupId, {
    title: 'Gym',
    amount: '30',
    paidBy: 'Alice',
    recurrence: 'Monthly',
  })

  await page.goto(`/groups/${groupId}/recurring`)
  await page.getByTestId('recurring-series').filter({ hasText: 'Gym' }).click()
  const stopButton = page.getByRole('button', { name: 'Stop recurring' })
  await expect(stopButton).toBeVisible()

  // Stopped from another device: this page keeps its focus and its data.
  const editHref = await page
    .getByRole('link', { name: 'Edit' })
    .getAttribute('href')
  const expenseId = editHref!.split('/').at(-2)
  const response = await page.request.post(
    '/api/trpc/groups.expenses.recurring.stop',
    { data: { json: { groupId, expenseId } } },
  )
  expect(response.ok()).toBe(true)

  await stopButton.click()
  await page.getByRole('button', { name: 'Stop', exact: true }).click()

  // The refused stop refreshes the page, which no longer offers the actions.
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 15_000 })
  await expect(stopButton).toHaveCount(0)
})

test('shows a stopped expense as not recurring after it was opened before', async ({
  page,
}) => {
  const groupId = await createGroup(page, {
    name: `E2E Recurring reopen ${uniqueSuffix()}`,
    participants: PARTICIPANTS,
  })

  await addExpense(page, groupId, {
    title: 'Phone',
    amount: '15',
    paidBy: 'Alice',
    recurrence: 'Monthly',
  })

  // Opening the expense first leaves it in the client cache.
  await openExpense(page, 'Phone')
  const field = fieldByLabel(page, 'Expense Recurrence').getByRole('combobox')
  await expect(field).toContainText('Monthly')

  await openTab(page, 'Recurring')
  await page
    .getByTestId('recurring-series')
    .filter({ hasText: 'Phone' })
    .click()
  await page.getByRole('button', { name: 'Stop recurring' }).click()
  await page.getByRole('button', { name: 'Stop', exact: true }).click()
  await page.waitForURL(/\/recurring$/, { timeout: 30_000 })

  await openTab(page, 'Expenses')
  await openExpense(page, 'Phone')
  await expect(
    fieldByLabel(page, 'Expense Recurrence').getByRole('combobox'),
  ).toContainText('None')
})
