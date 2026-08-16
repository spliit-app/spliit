import { addExpense, createGroup, openTab, uniqueSuffix } from './app'
import { expect, test } from './fixtures'
import { cardByTitle, money, selectRadixOption } from './ui'

const PARTICIPANTS = ['Alice', 'Bob', 'Carol']

test('breaks spending down by participant and by category', async ({
  page,
}) => {
  const groupId = await createGroup(page, {
    name: `E2E Breakdown ${uniqueSuffix()}`,
    participants: PARTICIPANTS,
  })

  await addExpense(page, groupId, {
    title: 'Weekly shop',
    amount: '90',
    paidBy: 'Alice',
    category: 'Groceries',
  })
  await addExpense(page, groupId, {
    title: 'Taxi',
    amount: '30',
    paidBy: 'Bob',
    category: 'Taxi',
  })

  await openTab(page, 'Stats')

  // Paid, not share: Alice paid 90 and Bob 30, while all three share both.
  const byParticipant = cardByTitle(page, 'Spending by participant')
  await expect(byParticipant).toContainText('Alice')
  await expect(byParticipant).toContainText(money(90))
  await expect(byParticipant).toContainText('Bob')
  await expect(byParticipant).toContainText(money(30))

  const byCategory = cardByTitle(page, 'Spending by category')
  await expect(byCategory).toContainText('Groceries')
  await expect(byCategory).toContainText(money(90))
  await expect(byCategory).toContainText('Taxi')
  await expect(byCategory).toContainText(money(30))
})

test('summarises count, average and largest expense', async ({ page }) => {
  const groupId = await createGroup(page, {
    name: `E2E Summary ${uniqueSuffix()}`,
    participants: PARTICIPANTS,
  })

  await addExpense(page, groupId, {
    title: 'Dinner',
    amount: '90',
    paidBy: 'Alice',
  })
  await addExpense(page, groupId, {
    title: 'Taxi',
    amount: '30',
    paidBy: 'Bob',
  })

  await openTab(page, 'Stats')

  const summary = cardByTitle(page, 'Summary')
  await expect(summary).toContainText('Expenses')
  await expect(summary).toContainText('2')
  // 120 across two expenses.
  await expect(summary).toContainText(money(60))
  await expect(summary).toContainText(money(90))
})

test('restricts the stats to the selected period', async ({ page }) => {
  const groupId = await createGroup(page, {
    name: `E2E Period ${uniqueSuffix()}`,
    participants: PARTICIPANTS,
  })

  // A fixed past date rather than a relative one: "This year" must exclude it
  // no matter when the suite runs.
  await addExpense(page, groupId, {
    title: 'Ancient',
    amount: '50',
    paidBy: 'Alice',
    date: '2020-01-15',
  })
  await addExpense(page, groupId, {
    title: 'Recent',
    amount: '20',
    paidBy: 'Bob',
  })

  await openTab(page, 'Stats')

  const totals = cardByTitle(page, 'Totals')
  await expect(totals).toContainText(money(70))

  await selectRadixOption(page, page.getByRole('combobox').first(), 'This year')

  // The 2020 expense drops out; only the one recorded today is left.
  await expect(totals).toContainText(money(20))
  await expect(totals).not.toContainText(money(70))
})
