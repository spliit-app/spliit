export const monthlySpendingGroupingOptions = [
  'categoryGroup',
  'category',
] as const

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
}

type MutableMonthlySpendingCategory = MonthlySpendingCategory

type MutableMonthlySpendingMonth = Omit<MonthlySpendingMonth, 'categories'> & {
  categories: Map<string, MutableMonthlySpendingCategory>
}

type MonthParts = { year: number; month: number }

export function getMonthlyCategorySpending(
  expenses: MonthlySpendingExpense[],
  options: {
    grouping?: MonthlySpendingGrouping
    now?: Date
    from?: string
    to?: string
  } = {},
): MonthlyCategorySpending {
  const grouping = options.grouping ?? 'categoryGroup'
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

  const firstExpenseMonth = getMonthPartsFromKey(firstExpenseMonthKey)
  const lastExpenseMonth = getMonthPartsFromKey(lastExpenseMonthKey)
  const nowMonth = getMonthPartsFromDate(options.now ?? new Date())
  const firstMonth = options.from
    ? getMonthPartsFromDateString(options.from)
    : firstExpenseMonth
  const lastMonth = options.to
    ? getMonthPartsFromDateString(options.to)
    : maxMonth(lastExpenseMonth, nowMonth)
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
  return {
    months: sortedMonths,
    categories: sortedCategories,
    maxExpenseAmount,
  }
}

/**
 * Applies chart-local grouping onto the category-level payload from
 * `groups.stats.overview`, so toggling Detailed / Categories does not refetch
 * the rest of the stats page.
 */
export function applyMonthlySpendingView(
  stats: MonthlyCategorySpending,
  options: {
    grouping?: MonthlySpendingGrouping
  } = {},
): MonthlyCategorySpending {
  const grouping = options.grouping ?? 'categoryGroup'

  if (stats.months.length === 0) {
    return { months: [], categories: [], maxExpenseAmount: 0 }
  }

  const months: MonthlySpendingMonth[] = []
  const categoryTotals = new Map<string, MutableMonthlySpendingCategory>()

  for (const month of stats.months) {
    const categories =
      grouping === 'categoryGroup'
        ? rollupCategories(month.categories)
        : sortCategories(month.categories.map((category) => ({ ...category })))

    months.push({ ...month, categories })

    for (const category of categories) {
      addCategoryToTotals(categoryTotals, category)
    }
  }

  return {
    months,
    categories: sortCategories(Array.from(categoryTotals.values())),
    maxExpenseAmount: Math.max(
      0,
      ...months.map((month) => month.expenseAmount),
    ),
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

function rollupCategories(categories: MonthlySpendingCategory[]) {
  const groups = new Map<string, MutableMonthlySpendingCategory>()
  for (const category of categories) {
    addCategoryToTotals(groups, {
      key: category.grouping,
      categoryId: null,
      grouping: category.grouping,
      name: category.grouping,
      amount: category.amount,
      expenseAmount: category.expenseAmount,
      incomeAmount: category.incomeAmount,
    })
  }
  return sortCategories(Array.from(groups.values()))
}

function addCategoryToTotals(
  totals: Map<string, MutableMonthlySpendingCategory>,
  category: MonthlySpendingCategory,
) {
  const existing = totals.get(category.key)
  if (existing) {
    existing.amount += category.amount
    existing.expenseAmount += category.expenseAmount
    existing.incomeAmount += category.incomeAmount
    return
  }
  totals.set(category.key, { ...category })
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

function getMonthPartsFromDate(date: Date): MonthParts {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() }
}

function getMonthPartsFromDateString(value: string): MonthParts {
  const [year, month] = value.split('-').map(Number)
  return { year, month: month - 1 }
}

function getMonthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

function getMonthPartsFromKey(monthKey: string): MonthParts {
  const [year, month] = monthKey.split('-').map(Number)
  return { year, month: month - 1 }
}

function maxMonth(left: MonthParts, right: MonthParts) {
  return getMonthKey(left.year, left.month) >=
    getMonthKey(right.year, right.month)
    ? left
    : right
}

function addMonths(year: number, month: number, monthsToAdd: number) {
  const date = new Date(Date.UTC(year, month + monthsToAdd, 1))
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() }
}

function getMonthKeysBetween(start: MonthParts, end: MonthParts) {
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
