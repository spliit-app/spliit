import dayjs, { type Dayjs } from 'dayjs'

export const RELATIVE_EXPENSE_DATE_GROUPS = {
  UPCOMING: 'upcoming',
  THIS_WEEK: 'thisWeek',
  EARLIER_THIS_MONTH: 'earlierThisMonth',
  LAST_MONTH: 'lastMonth',
  EARLIER_THIS_YEAR: 'earlierThisYear',
  LAST_YEAR: 'lastYear',
  OLDER: 'older',
} as const

export type ExpenseWithDate = {
  expenseDate: Date
}

export type ExpenseDateGroup<TExpense extends ExpenseWithDate> = {
  key: string
  label?: string
  expenses: TExpense[]
}

const RELATIVE_EXPENSE_DATE_GROUP_ORDER = Object.values(
  RELATIVE_EXPENSE_DATE_GROUPS,
)

function getRelativeExpenseDateGroup(date: Dayjs, today: Dayjs) {
  if (today.isBefore(date)) {
    return RELATIVE_EXPENSE_DATE_GROUPS.UPCOMING
  } else if (today.isSame(date, 'week')) {
    return RELATIVE_EXPENSE_DATE_GROUPS.THIS_WEEK
  } else if (today.isSame(date, 'month')) {
    return RELATIVE_EXPENSE_DATE_GROUPS.EARLIER_THIS_MONTH
  } else if (today.subtract(1, 'month').isSame(date, 'month')) {
    return RELATIVE_EXPENSE_DATE_GROUPS.LAST_MONTH
  } else if (today.isSame(date, 'year')) {
    return RELATIVE_EXPENSE_DATE_GROUPS.EARLIER_THIS_YEAR
  } else if (today.subtract(1, 'year').isSame(date, 'year')) {
    return RELATIVE_EXPENSE_DATE_GROUPS.LAST_YEAR
  } else {
    return RELATIVE_EXPENSE_DATE_GROUPS.OLDER
  }
}

export function groupExpensesByRelativeDate<TExpense extends ExpenseWithDate>(
  expenses: TExpense[],
  today: Dayjs = dayjs(),
): ExpenseDateGroup<TExpense>[] {
  const groupedExpenses = expenses.reduce(
    (result, expense) => {
      const expenseGroup = getRelativeExpenseDateGroup(
        dayjs(expense.expenseDate),
        today,
      )
      result[expenseGroup] = result[expenseGroup] ?? []
      result[expenseGroup].push(expense)
      return result
    },
    {} as Record<string, TExpense[]>,
  )

  return RELATIVE_EXPENSE_DATE_GROUP_ORDER.flatMap((key) => {
    const groupExpenses = groupedExpenses[key]
    if (!groupExpenses || groupExpenses.length === 0) return []
    return [{ key, expenses: groupExpenses }]
  })
}

export function groupExpensesByCalendarMonth<TExpense extends ExpenseWithDate>(
  expenses: TExpense[],
  options: {
    currentMonthLabel: string
    locale: string
    now?: Date
  },
): ExpenseDateGroup<TExpense>[] {
  const now = options.now ?? new Date()
  const currentYear = now.getUTCFullYear()
  const currentMonth = now.getUTCMonth()
  const monthFormatter = new Intl.DateTimeFormat(options.locale, {
    month: 'long',
    timeZone: 'UTC',
  })
  const groups = new Map<string, ExpenseDateGroup<TExpense>>()

  for (const expense of expenses) {
    const expenseYear = expense.expenseDate.getUTCFullYear()
    const expenseMonth = expense.expenseDate.getUTCMonth()
    const key = `${expenseYear}-${String(expenseMonth + 1).padStart(2, '0')}`
    const monthLabel = monthFormatter.format(
      new Date(Date.UTC(expenseYear, expenseMonth, 1)),
    )
    const label =
      expenseYear === currentYear && expenseMonth === currentMonth
        ? `${monthLabel} - ${options.currentMonthLabel}`
        : expenseYear === currentYear
        ? monthLabel
        : `${monthLabel} ${expenseYear}`

    if (!groups.has(key)) {
      groups.set(key, { key, label, expenses: [] })
    }

    groups.get(key)?.expenses.push(expense)
  }

  return Array.from(groups.values())
}
