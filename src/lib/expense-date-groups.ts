import dayjs, { type Dayjs } from 'dayjs'

export const EXPENSE_GROUPS = {
  UPCOMING: 'upcoming',
  THIS_WEEK: 'thisWeek',
  EARLIER_THIS_MONTH: 'earlierThisMonth',
  LAST_MONTH: 'lastMonth',
  EARLIER_THIS_YEAR: 'earlierThisYear',
  LAST_YEAR: 'lastYear',
  OLDER: 'older',
} as const

export const EXPENSE_GROUP_KEYS = Object.values(EXPENSE_GROUPS)

export type GroupedExpenses<T> = {
  key: string
  label?: string
  expenses: T[]
}[]

type ExpenseWithDate = { expenseDate: Date }

function getExpenseGroup(date: Dayjs, today: Dayjs) {
  if (today.isBefore(date)) {
    return EXPENSE_GROUPS.UPCOMING
  } else if (today.isSame(date, 'week')) {
    return EXPENSE_GROUPS.THIS_WEEK
  } else if (today.isSame(date, 'month')) {
    return EXPENSE_GROUPS.EARLIER_THIS_MONTH
  } else if (today.subtract(1, 'month').isSame(date, 'month')) {
    return EXPENSE_GROUPS.LAST_MONTH
  } else if (today.isSame(date, 'year')) {
    return EXPENSE_GROUPS.EARLIER_THIS_YEAR
  } else if (today.subtract(1, 'year').isSame(date, 'year')) {
    return EXPENSE_GROUPS.LAST_YEAR
  } else {
    return EXPENSE_GROUPS.OLDER
  }
}

export function getRelativeGroupedExpenses<T extends ExpenseWithDate>(
  expenses: T[],
  today = dayjs(),
): GroupedExpenses<T> {
  const groupedExpenses = expenses.reduce(
    (result, expense) => {
      const expenseGroup = getExpenseGroup(dayjs(expense.expenseDate), today)
      result[expenseGroup] = result[expenseGroup] ?? []
      result[expenseGroup].push(expense)
      return result
    },
    {} as { [key: string]: T[] },
  )

  return EXPENSE_GROUP_KEYS.flatMap((key) => {
    const groupExpenses = groupedExpenses[key]
    return groupExpenses ? [{ key, expenses: groupExpenses }] : []
  })
}

function getUtcYearAndMonth(date: Date) {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
  }
}

function formatMonthLabel(
  year: number,
  month: number,
  locale: string,
  today: Date,
  currentMonthLabel: string,
) {
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth()
  const labelDate = new Date(year, month)
  const monthName = labelDate.toLocaleString(locale, { month: 'long' })

  if (year === currentYear && month === currentMonth) {
    return `${monthName} - ${currentMonthLabel}`
  }
  if (year === currentYear) {
    return monthName
  }
  return `${monthName} ${year}`
}

export function getFixedMonthlyGroupedExpenses<T extends ExpenseWithDate>(
  expenses: T[],
  locale: string,
  today = new Date(),
  currentMonthLabel = 'Current Month',
): GroupedExpenses<T> {
  const groups = new Map<
    string,
    { year: number; month: number; expenses: T[] }
  >()

  for (const expense of expenses) {
    const { year, month } = getUtcYearAndMonth(expense.expenseDate)
    const key = `${year}-${String(month + 1).padStart(2, '0')}`
    const group = groups.get(key) ?? { year, month, expenses: [] }
    group.expenses.push(expense)
    groups.set(key, group)
  }

  return Array.from(groups, ([key, group]) => ({
    key,
    label: formatMonthLabel(
      group.year,
      group.month,
      locale,
      today,
      currentMonthLabel,
    ),
    expenses: group.expenses,
  }))
}
