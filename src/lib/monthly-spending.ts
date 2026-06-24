export const monthlySpendingRangeOptions = ['3', '6', '12', 'all'] as const
export const monthlySpendingGroupingOptions = [
  'categoryGroup',
  'category',
] as const

export type MonthlySpendingRange = (typeof monthlySpendingRangeOptions)[number]
export type MonthlySpendingGrouping =
  (typeof monthlySpendingGroupingOptions)[number]

type ExpenseCategory = {
  id: number
  grouping: string
  name: string
}

export type MonthlySpendingExpense = {
  amount: number
  category: ExpenseCategory | null
  expenseDate: Date
  isReimbursement: boolean
}

export type MonthlySpendingCategory = {
  key: string
  categoryId: number | null
  grouping: string
  name: string
  amount: number
  expenseAmount: number
  incomeAmount: number
}

export type MonthlySpendingMonth = {
  key: string
  year: number
  month: number
  amount: number
  expenseAmount: number
  incomeAmount: number
  categories: MonthlySpendingCategory[]
}

export type MonthlyCategorySpending = {
  months: MonthlySpendingMonth[]
  categories: MonthlySpendingCategory[]
  maxExpenseAmount: number
  highlightedMonthKey?: string
}

type MutableMonthlySpendingCategory = MonthlySpendingCategory

type MutableMonthlySpendingMonth = Omit<MonthlySpendingMonth, 'categories'> & {
  categories: Map<string, MutableMonthlySpendingCategory>
}

export function getMonthlyCategorySpending(
  expenses: MonthlySpendingExpense[],
  options: {
    grouping?: MonthlySpendingGrouping
    range?: MonthlySpendingRange
  } = {},
): MonthlyCategorySpending {
  const grouping = options.grouping ?? 'categoryGroup'
  const range = options.range ?? '6'
  const expensesForStats = expenses.filter(
    (expense) => !expense.isReimbursement,
  )

  if (expensesForStats.length === 0) {
    return { months: [], categories: [], maxExpenseAmount: 0 }
  }

  const expenseMonthKeys = expensesForStats.map((expense) =>
    getMonthKeyFromDate(expense.expenseDate),
  )
  const firstExpenseMonthKey = expenseMonthKeys.reduce((first, monthKey) =>
    monthKey < first ? monthKey : first,
  )
  const lastExpenseMonthKey = expenseMonthKeys.reduce((last, monthKey) =>
    monthKey > last ? monthKey : last,
  )

  const lastMonth = getMonthPartsFromKey(lastExpenseMonthKey)
  const firstMonth =
    range === 'all'
      ? getMonthPartsFromKey(firstExpenseMonthKey)
      : addMonths(lastMonth.year, lastMonth.month, -Number(range) + 1)
  const monthKeys = getMonthKeysBetween(firstMonth, lastMonth)
  const months = new Map<string, MutableMonthlySpendingMonth>()
  const categoryTotals = new Map<string, MutableMonthlySpendingCategory>()

  for (const monthKey of monthKeys) {
    const { year, month } = getMonthPartsFromKey(monthKey)
    months.set(monthKey, {
      key: monthKey,
      year,
      month,
      amount: 0,
      expenseAmount: 0,
      incomeAmount: 0,
      categories: new Map(),
    })
  }

  for (const expense of expensesForStats) {
    const month = months.get(getMonthKeyFromDate(expense.expenseDate))
    if (!month) continue

    const category = getCategoryForGrouping(expense.category, grouping)
    addAmount(month, category, expense.amount)
    addAmountToCategoryTotals(categoryTotals, category, expense.amount)
  }

  const sortedMonths = Array.from(months.values()).map(
    ({ categories, ...month }) => ({
      ...month,
      categories: sortCategories(Array.from(categories.values())),
    }),
  )
  const sortedCategories = sortCategories(Array.from(categoryTotals.values()))
  const maxExpenseAmount = Math.max(
    0,
    ...sortedMonths.map((month) => month.expenseAmount),
  )
  const currentMonthKey = getMonthKeyFromDate(new Date())
  const highlightedMonthKey = months.has(currentMonthKey)
    ? currentMonthKey
    : sortedMonths.at(-1)?.key

  return {
    months: sortedMonths,
    categories: sortedCategories,
    maxExpenseAmount,
    highlightedMonthKey,
  }
}

function addAmount(
  month: MutableMonthlySpendingMonth,
  category: MonthlySpendingCategory,
  amount: number,
) {
  month.amount += amount
  month.expenseAmount += Math.max(amount, 0)
  month.incomeAmount += Math.min(amount, 0)

  const monthCategory = getOrCreateCategory(month.categories, category)
  addAmountToCategory(monthCategory, amount)
}

function addAmountToCategoryTotals(
  categoryTotals: Map<string, MutableMonthlySpendingCategory>,
  category: MonthlySpendingCategory,
  amount: number,
) {
  const categoryTotal = getOrCreateCategory(categoryTotals, category)
  addAmountToCategory(categoryTotal, amount)
}

function getOrCreateCategory(
  categories: Map<string, MutableMonthlySpendingCategory>,
  category: MonthlySpendingCategory,
) {
  if (!categories.has(category.key)) {
    categories.set(category.key, { ...category })
  }
  return categories.get(category.key) as MutableMonthlySpendingCategory
}

function addAmountToCategory(
  category: MutableMonthlySpendingCategory,
  amount: number,
) {
  category.amount += amount
  category.expenseAmount += Math.max(amount, 0)
  category.incomeAmount += Math.min(amount, 0)
}

function getCategoryForGrouping(
  category: ExpenseCategory | null,
  grouping: MonthlySpendingGrouping,
): MonthlySpendingCategory {
  const safeCategory = category ?? {
    id: 0,
    grouping: 'Uncategorized',
    name: 'General',
  }

  if (grouping === 'categoryGroup') {
    return {
      key: safeCategory.grouping,
      categoryId: null,
      grouping: safeCategory.grouping,
      name: safeCategory.grouping,
      amount: 0,
      expenseAmount: 0,
      incomeAmount: 0,
    }
  }

  return {
    key: String(safeCategory.id),
    categoryId: safeCategory.id,
    grouping: safeCategory.grouping,
    name: safeCategory.name,
    amount: 0,
    expenseAmount: 0,
    incomeAmount: 0,
  }
}

function sortCategories(categories: MonthlySpendingCategory[]) {
  return categories.sort((categoryA, categoryB) => {
    const amountDifference = categoryB.expenseAmount - categoryA.expenseAmount
    if (amountDifference !== 0) return amountDifference
    return categoryA.key.localeCompare(categoryB.key)
  })
}

function getMonthKeyFromDate(date: Date) {
  return getMonthKey(date.getUTCFullYear(), date.getUTCMonth())
}

function getMonthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

function getMonthPartsFromKey(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number)
  return { year, month: month - 1 }
}

function addMonths(year: number, month: number, monthsToAdd: number) {
  const date = new Date(Date.UTC(year, month + monthsToAdd, 1))
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() }
}

function getMonthKeysBetween(
  start: { year: number; month: number },
  end: { year: number; month: number },
) {
  const monthKeys: string[] = []
  let current = start

  while (
    getMonthKey(current.year, current.month) <= getMonthKey(end.year, end.month)
  ) {
    monthKeys.push(getMonthKey(current.year, current.month))
    current = addMonths(current.year, current.month, 1)
  }

  return monthKeys
}
