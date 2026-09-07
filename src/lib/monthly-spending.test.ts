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
      { now: new Date('2026-06-15T00:00:00.000Z') },
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
      { now: new Date('2026-06-15T00:00:00.000Z') },
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
      {
        grouping: 'category',
        now: new Date('2026-06-15T00:00:00.000Z'),
      },
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
      { now: new Date('2026-03-20T00:00:00.000Z') },
    )

    expect(stats.months.map((month) => month.key)).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
    ])
    expect(stats.months[1]?.expenseAmount).toBe(0)
  })

  it('extends the window through the current month when the group is inactive', () => {
    const stats = getMonthlyCategorySpending(
      [expense('2025-06-15T00:00:00.000Z', 1200)],
      { now: new Date('2026-09-07T00:00:00.000Z') },
    )

    expect(stats.months[0]?.key).toBe('2025-06')
    expect(stats.months[stats.months.length - 1]?.key).toBe('2026-09')
    expect(stats.months[stats.months.length - 1]?.expenseAmount).toBe(0)
  })

  it('stops at an explicit to date so a past range is not padded to today', () => {
    const stats = getMonthlyCategorySpending(
      [
        expense('2026-01-15T00:00:00.000Z', 1200),
        expense('2026-03-15T00:00:00.000Z', 800),
      ],
      {
        now: new Date('2026-09-07T00:00:00.000Z'),
        to: '2026-03-31',
      },
    )

    expect(stats.months.map((month) => month.key)).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
    ])
  })

  it('fills from an explicit from date even before the first expense', () => {
    const stats = getMonthlyCategorySpending(
      [expense('2026-03-15T00:00:00.000Z', 800)],
      {
        now: new Date('2026-03-20T00:00:00.000Z'),
        from: '2026-01-01',
        to: '2026-03-31',
      },
    )

    expect(stats.months.map((month) => month.key)).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
    ])
    expect(stats.months[0]?.expenseAmount).toBe(0)
  })

  it('supports category group and detailed category modes', () => {
    const expenses = [
      expense('2026-06-01T00:00:00.000Z', 1200, categories.diningOut),
      expense('2026-06-02T00:00:00.000Z', 800, categories.groceries),
    ]
    const now = new Date('2026-06-15T00:00:00.000Z')

    const groupedStats = getMonthlyCategorySpending(expenses, {
      grouping: 'categoryGroup',
      now,
    })
    const detailedStats = getMonthlyCategorySpending(expenses, {
      grouping: 'category',
      now,
    })

    expect(groupedStats.categories).toMatchObject([
      { key: 'Food and Drink', expenseAmount: 2000 },
    ])
    expect(
      detailedStats.categories.map((category) => category.key).sort(),
    ).toEqual(['8', '9'])
  })

  it('can apply grouping onto a category-level payload', () => {
    const expenses = [
      expense('2026-01-15T00:00:00.000Z', 1200, categories.diningOut),
      expense('2026-06-15T00:00:00.000Z', 800, categories.groceries),
    ]
    const now = new Date('2026-06-15T00:00:00.000Z')
    const full = getMonthlyCategorySpending(expenses, {
      grouping: 'category',
      now,
    })

    expect(
      applyMonthlySpendingView(full, {
        grouping: 'categoryGroup',
      }),
    ).toEqual(
      getMonthlyCategorySpending(expenses, {
        grouping: 'categoryGroup',
        now,
      }),
    )
  })
})
