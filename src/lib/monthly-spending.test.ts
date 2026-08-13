import {
  MonthlySpendingExpense,
  applyMonthlySpendingView,
  getMonthlyCategorySpending,
} from './monthly-spending'

const categories = {
  diningOut: { id: 8, grouping: 'Food and Drink', name: 'Dining Out' },
  groceries: { id: 9, grouping: 'Food and Drink', name: 'Groceries' },
  rent: { id: 18, grouping: 'Home', name: 'Rent' },
}

function expense(
  date: string,
  amount: number,
  category: MonthlySpendingExpense['category'] = categories.diningOut,
  isReimbursement = false,
): MonthlySpendingExpense {
  return {
    amount,
    category,
    expenseDate: new Date(date),
    isReimbursement,
  }
}

describe('getMonthlyCategorySpending', () => {
  it('groups expenses by UTC calendar month', () => {
    const stats = getMonthlyCategorySpending(
      [expense('2026-06-01T00:00:00.000Z', 1200)],
      { range: 'all' },
    )

    expect(stats.months).toHaveLength(1)
    expect(stats.months[0]?.key).toBe('2026-06')
    expect(stats.months[0]?.expenseAmount).toBe(1200)
  })

  it('excludes reimbursements from monthly spending', () => {
    const stats = getMonthlyCategorySpending(
      [
        expense('2026-06-15T00:00:00.000Z', 1200),
        expense('2026-06-15T00:00:00.000Z', 5000, categories.rent, true),
      ],
      { range: 'all' },
    )

    expect(stats.months[0]?.expenseAmount).toBe(1200)
    expect(stats.categories).toHaveLength(1)
  })

  it('aggregates category totals correctly', () => {
    const stats = getMonthlyCategorySpending(
      [
        expense('2026-06-01T00:00:00.000Z', 1200, categories.diningOut),
        expense('2026-06-02T00:00:00.000Z', 800, categories.diningOut),
        expense('2026-06-03T00:00:00.000Z', 3000, categories.rent),
      ],
      { grouping: 'category', range: 'all' },
    )

    expect(
      stats.categories.find((category) => category.key === '8'),
    ).toMatchObject({
      amount: 2000,
      expenseAmount: 2000,
    })
    expect(
      stats.categories.find((category) => category.key === '18')?.expenseAmount,
    ).toBe(3000)
  })

  it('sorts months chronologically and fills empty months in range', () => {
    const stats = getMonthlyCategorySpending(
      [
        expense('2026-01-15T00:00:00.000Z', 1200),
        expense('2026-03-15T00:00:00.000Z', 800),
      ],
      { range: 'all' },
    )

    expect(stats.months.map((month) => month.key)).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
    ])
    expect(stats.months[1]?.expenseAmount).toBe(0)
  })

  it('uses the selected numeric range ending at the latest spending month', () => {
    const stats = getMonthlyCategorySpending(
      [
        expense('2026-01-15T00:00:00.000Z', 1200),
        expense('2026-06-15T00:00:00.000Z', 800),
      ],
      { range: '3' },
    )

    expect(stats.months.map((month) => month.key)).toEqual([
      '2026-04',
      '2026-05',
      '2026-06',
    ])
  })

  it('supports category group and detailed category modes', () => {
    const expenses = [
      expense('2026-06-01T00:00:00.000Z', 1200, categories.diningOut),
      expense('2026-06-02T00:00:00.000Z', 800, categories.groceries),
    ]

    const groupedStats = getMonthlyCategorySpending(expenses, {
      grouping: 'categoryGroup',
      range: 'all',
    })
    const detailedStats = getMonthlyCategorySpending(expenses, {
      grouping: 'category',
      range: 'all',
    })

    expect(groupedStats.categories).toMatchObject([
      { key: 'Food and Drink', expenseAmount: 2000 },
    ])
    expect(
      detailedStats.categories.map((category) => category.key).sort(),
    ).toEqual(['8', '9'])
  })

  it('can apply grouping and range onto a category-level all-range payload', () => {
    const expenses = [
      expense('2026-01-15T00:00:00.000Z', 1200, categories.diningOut),
      expense('2026-06-15T00:00:00.000Z', 800, categories.groceries),
    ]
    const full = getMonthlyCategorySpending(expenses, {
      grouping: 'category',
      range: 'all',
    })

    expect(
      applyMonthlySpendingView(full, {
        grouping: 'categoryGroup',
        range: '3',
      }),
    ).toEqual(
      getMonthlyCategorySpending(expenses, {
        grouping: 'categoryGroup',
        range: '3',
      }),
    )
  })
})
