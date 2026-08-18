import { getBalances } from './balances'
import {
  calculateShare,
  filterExpensesByDateRange,
  getExpensesByCategory,
  getExpensesByMonth,
  getRecurringSpending,
  getSpendingByCategory,
  getSpendingByParticipant,
  getSpendingOverTime,
  getSpendingSummary,
  getTotalActiveUserShare,
  getTotalGroupSpending,
} from './totals'

type Expense = Parameters<typeof getTotalGroupSpending>[0][number]
type SplitMode = Expense['splitMode']

const SPLIT_MODES: SplitMode[] = [
  'EVENLY',
  'BY_SHARES',
  'BY_PERCENTAGE',
  'BY_AMOUNT',
]

function makeExpense(partial: Partial<Expense>): Expense {
  return {
    id: 'expense',
    title: 'Expense',
    amount: 0,
    category: null,
    isReimbursement: false,
    splitMode: 'EVENLY',
    expenseDate: new Date('2024-01-01T00:00:00Z'),
    paidBy: { id: 'alice', name: 'Alice' },
    paidFor: [],
    ...partial,
  } as unknown as Expense
}

function splitExpense(
  id: string,
  amount: number,
  paidFor: [string, number][],
  splitMode: SplitMode = 'EVENLY',
): Expense {
  return makeExpense({
    id,
    amount,
    splitMode,
    paidBy: { id: paidFor[0][0], name: paidFor[0][0] },
    paidFor: paidFor.map(([participantId, shares]) => ({
      participant: { id: participantId, name: participantId },
      shares,
    })),
  } as Partial<Expense>)
}

const groceries = { id: 1, grouping: 'Food and Drink', name: 'Groceries' }
const transport = { id: 2, grouping: 'Transportation', name: 'Car' }

/** A seeded LCG, so a failing case is reproducible from the seed alone. */
function makeRandom(seed: number) {
  let state = seed >>> 0
  return (bound: number) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state % bound
  }
}

describe('calculateShare', () => {
  it('does not hand three participants 31.67 each out of 95.00', () => {
    // The expense form used to show every participant 3166.66…, which
    // `formatCurrency` then rounded up individually: three people owing 31.67
    // of a 95.00 expense.
    const expense = splitExpense('e1', 9500, [
      ['alice', 1],
      ['bob', 1],
      ['carol', 1],
    ])

    const shares = ['alice', 'bob', 'carol'].map((id) =>
      calculateShare(id, expense),
    )

    expect(shares.reduce((sum, share) => sum + share, 0)).toBe(9500)
    expect([...shares].sort((a, b) => a - b)).toEqual([3166, 3167, 3167])
  })

  it('ignores reimbursements, which balances deliberately count', () => {
    const settlement = makeExpense({
      amount: 500,
      isReimbursement: true,
      paidFor: [{ participant: { id: 'bob', name: 'Bob' }, shares: 1 }],
    } as Partial<Expense>)

    expect(calculateShare('bob', settlement)).toBe(0)
    expect(getBalances([settlement]).bob.paidFor).toBe(500)
  })

  it('returns zero for a participant the expense was not paid for', () => {
    expect(
      calculateShare('carol', splitExpense('e1', 100, [['alice', 1]])),
    ).toBe(0)
  })

  it.each(SPLIT_MODES)(
    'charges what the balances tab charges (%s)',
    (splitMode) => {
      // Deliberately broken invariants: percentages adding up to 90% and
      // by-amount shares adding up to 90 of a 100 expense are exactly the rows
      // `calculateShare` used to disagree with `getBalances` on.
      const shares: [string, number][] =
        splitMode === 'BY_PERCENTAGE'
          ? [
              ['alice', 6000],
              ['bob', 3000],
            ]
          : splitMode === 'BY_AMOUNT'
            ? [
                ['alice', 60],
                ['bob', 30],
              ]
            : [
                ['alice', 2],
                ['bob', 1],
              ]
      const expense = splitExpense('e1', 100, shares, splitMode)
      const balances = getBalances([expense])

      for (const id of ['alice', 'bob']) {
        expect(calculateShare(id, expense)).toBe(balances[id].paidFor)
      }
    },
  )

  it('agrees with the balances tab across randomised expenses', () => {
    const random = makeRandom(20260811)

    for (let run = 0; run < 500; run++) {
      const participants = Array.from(
        { length: 2 + random(6) },
        (_, index) => `participant-${index}`,
      )
      const paidFor = participants
        .filter(() => random(2) === 0)
        .map((id): [string, number] => [id, 1 + random(5000)])
      if (paidFor.length === 0)
        paidFor.push([participants[0], 1 + random(5000)])

      const expense = splitExpense(
        `run-${run}`,
        1 + random(100000),
        paidFor,
        SPLIT_MODES[random(SPLIT_MODES.length)],
      )
      const balances = getBalances([expense])

      for (const id of participants) {
        expect(calculateShare(id, expense)).toBe(balances[id]?.paidFor ?? 0)
      }
    }
  })
})

describe('getTotalActiveUserShare', () => {
  it('sums to the group total once every participant is counted', () => {
    const participants = ['alice', 'bob', 'carol']
    const expenses = [
      splitExpense('e1', 9500, [
        ['alice', 1],
        ['bob', 1],
        ['carol', 1],
      ]),
      splitExpense(
        'e2',
        10000,
        [
          ['alice', 1],
          ['bob', 2],
        ],
        'BY_SHARES',
      ),
    ]

    const total = participants.reduce(
      (sum, id) => sum + getTotalActiveUserShare(id, expenses),
      0,
    )

    expect(total).toBe(getTotalGroupSpending(expenses))
  })

  it('is zero for someone who is not part of any expense', () => {
    expect(
      getTotalActiveUserShare('dave', [
        splitExpense('e1', 100, [['alice', 1]]),
      ]),
    ).toBe(0)
  })
})

describe('getSpendingByCategory', () => {
  it('aggregates by category, ignores reimbursements and sorts by total', () => {
    const result = getSpendingByCategory([
      makeExpense({ amount: 1000, category: groceries }),
      makeExpense({ amount: 500, category: groceries }),
      makeExpense({ amount: 3000, category: transport }),
      makeExpense({ amount: 9999, category: transport, isReimbursement: true }),
    ])

    expect(result).toEqual([
      { categoryId: 2, grouping: 'Transportation', name: 'Car', total: 3000 },
      {
        categoryId: 1,
        grouping: 'Food and Drink',
        name: 'Groceries',
        total: 1500,
      },
    ])
  })

  it('treats a missing category as Uncategorized/General', () => {
    const result = getSpendingByCategory([
      makeExpense({ amount: 200, category: null }),
    ])
    expect(result).toEqual([
      {
        categoryId: 0,
        grouping: 'Uncategorized',
        name: 'General',
        total: 200,
      },
    ])
  })
})

describe('getExpensesByCategory', () => {
  it('returns only the matching category, excludes reimbursements and sorts newest first', () => {
    const older = makeExpense({
      id: 'a',
      amount: 1000,
      category: groceries,
      expenseDate: new Date('2024-01-10T00:00:00Z'),
    })
    const newer = makeExpense({
      id: 'b',
      amount: 500,
      category: groceries,
      expenseDate: new Date('2024-02-20T00:00:00Z'),
    })
    const otherCategory = makeExpense({
      id: 'c',
      amount: 3000,
      category: transport,
      expenseDate: new Date('2024-03-01T00:00:00Z'),
    })
    const reimbursement = makeExpense({
      id: 'd',
      amount: 9999,
      category: groceries,
      isReimbursement: true,
      expenseDate: new Date('2024-04-01T00:00:00Z'),
    })

    const result = getExpensesByCategory(
      [older, newer, otherCategory, reimbursement],
      groceries.id,
    )

    expect(result.map((expense) => expense.id)).toEqual(['b', 'a'])
  })

  it('matches expenses without a category against the Uncategorized id (0)', () => {
    const uncategorized = makeExpense({ id: 'a', amount: 200, category: null })
    const categorized = makeExpense({
      id: 'b',
      amount: 300,
      category: groceries,
    })

    const result = getExpensesByCategory([uncategorized, categorized], 0)

    expect(result.map((expense) => expense.id)).toEqual(['a'])
  })
})

describe('getExpensesByMonth', () => {
  it('returns only the matching month, excludes reimbursements and sorts newest first', () => {
    const early = makeExpense({
      id: 'a',
      expenseDate: new Date('2024-03-05T00:00:00Z'),
    })
    const late = makeExpense({
      id: 'b',
      expenseDate: new Date('2024-03-25T00:00:00Z'),
    })
    const otherMonth = makeExpense({
      id: 'c',
      expenseDate: new Date('2024-04-01T00:00:00Z'),
    })
    const reimbursement = makeExpense({
      id: 'd',
      isReimbursement: true,
      expenseDate: new Date('2024-03-15T00:00:00Z'),
    })

    const result = getExpensesByMonth(
      [early, late, otherMonth, reimbursement],
      '2024-03',
    )

    expect(result.map((expense) => expense.id)).toEqual(['b', 'a'])
  })
})

describe('getSpendingByParticipant', () => {
  it('computes paid and share per participant, sorted by amount paid', () => {
    const participants = [
      { id: 'alice', name: 'Alice' },
      { id: 'bob', name: 'Bob' },
    ]
    const expenses = [
      makeExpense({
        amount: 1000,
        paidBy: { id: 'alice', name: 'Alice' },
        paidFor: [
          { participant: { id: 'alice', name: 'Alice' }, shares: 1 },
          { participant: { id: 'bob', name: 'Bob' }, shares: 1 },
        ],
      }),
    ]

    const result = getSpendingByParticipant(participants, expenses)

    expect(result).toEqual([
      {
        participantId: 'alice',
        name: 'Alice',
        paid: 1000,
        paidCount: 1,
        share: 500,
      },
      { participantId: 'bob', name: 'Bob', paid: 0, paidCount: 0, share: 500 },
    ])
  })
})

describe('getRecurringSpending', () => {
  it('summarizes active recurring expenses per period', () => {
    const result = getRecurringSpending([
      { amount: 1000, recurrenceRule: 'MONTHLY', isReimbursement: false },
      { amount: 500, recurrenceRule: 'MONTHLY', isReimbursement: false },
      { amount: 700, recurrenceRule: 'WEEKLY', isReimbursement: false },
      { amount: 100, recurrenceRule: 'DAILY', isReimbursement: false },
      { amount: 999, recurrenceRule: 'NONE', isReimbursement: false },
      { amount: 999, recurrenceRule: 'MONTHLY', isReimbursement: true },
    ])

    expect(result.count).toBe(4)
    expect(result.byPeriod).toEqual([
      { period: 'DAILY', count: 1, total: 100 },
      { period: 'WEEKLY', count: 1, total: 700 },
      { period: 'MONTHLY', count: 2, total: 1500 },
    ])
    const expectedMonthly = Math.round(
      100 * (365.25 / 12) + 700 * (365.25 / 12 / 7) + 1500,
    )
    expect(result.estimatedMonthly).toBe(expectedMonthly)
    // Yearly is computed independently from the monthly figure (not × 12) so it
    // does not compound the monthly rounding.
    const expectedYearly = Math.round(
      100 * 365.25 + 700 * (365.25 / 7) + 1500 * 12,
    )
    expect(result.estimatedYearly).toBe(expectedYearly)
  })

  it('returns an empty summary when there are no recurring expenses', () => {
    const result = getRecurringSpending([
      { amount: 1000, recurrenceRule: 'NONE', isReimbursement: false },
    ])
    expect(result.count).toBe(0)
    expect(result.byPeriod).toEqual([])
    expect(result.estimatedMonthly).toBe(0)
    expect(result.estimatedYearly).toBe(0)
  })
})

describe('filterExpensesByDateRange', () => {
  const expenses = [
    { expenseDate: new Date('2026-01-15T00:00:00Z') },
    { expenseDate: new Date('2026-02-10T00:00:00Z') },
    { expenseDate: new Date('2026-03-20T00:00:00Z') },
  ]

  it('returns everything when no bounds are given', () => {
    expect(filterExpensesByDateRange(expenses)).toHaveLength(3)
  })

  it('filters inclusively on both bounds', () => {
    const result = filterExpensesByDateRange(
      expenses,
      '2026-02-01',
      '2026-02-28',
    )
    expect(result).toHaveLength(1)
    expect(result[0].expenseDate.toISOString().slice(0, 10)).toBe('2026-02-10')
  })

  it('supports an open-ended lower bound', () => {
    expect(filterExpensesByDateRange(expenses, '2026-02-10')).toHaveLength(2)
  })
})

describe('getSpendingOverTime', () => {
  it('buckets by month and fills the gaps between first and last', () => {
    const result = getSpendingOverTime([
      makeExpense({
        amount: 1000,
        expenseDate: new Date('2026-01-15T00:00:00Z'),
      }),
      makeExpense({
        amount: 500,
        expenseDate: new Date('2026-01-20T00:00:00Z'),
      }),
      makeExpense({
        amount: 9999,
        expenseDate: new Date('2026-01-05T00:00:00Z'),
        isReimbursement: true,
      }),
      makeExpense({
        amount: 300,
        expenseDate: new Date('2026-03-01T00:00:00Z'),
      }),
    ])

    expect(result).toEqual([
      { month: '2026-01', total: 1500 },
      { month: '2026-02', total: 0 },
      { month: '2026-03', total: 300 },
    ])
  })

  it('returns an empty array when there are no expenses', () => {
    expect(getSpendingOverTime([])).toEqual([])
  })
})

describe('getSpendingSummary', () => {
  it('computes count, average, largest expense and active span', () => {
    const result = getSpendingSummary([
      makeExpense({
        amount: 1000,
        title: 'Hotel',
        expenseDate: new Date('2026-01-15T00:00:00Z'),
      }),
      makeExpense({
        amount: 500,
        title: 'Lunch',
        expenseDate: new Date('2026-01-10T00:00:00Z'),
      }),
      makeExpense({
        amount: 99999,
        title: 'Refund',
        expenseDate: new Date('2026-01-20T00:00:00Z'),
        isReimbursement: true,
      }),
    ])

    expect(result).toEqual({
      expenseCount: 2,
      totalSpending: 1500,
      averageExpense: 750,
      largestExpense: { title: 'Hotel', amount: 1000 },
      firstDate: '2026-01-10',
      lastDate: '2026-01-15',
    })
  })

  it('returns a zeroed summary with no expenses', () => {
    expect(getSpendingSummary([])).toEqual({
      expenseCount: 0,
      totalSpending: 0,
      averageExpense: 0,
      largestExpense: null,
      firstDate: null,
      lastDate: null,
    })
  })
})

describe('getSpendingByParticipant shares', () => {
  it('adds up to the total the group spent', () => {
    const participants = [
      { id: 'alice', name: 'alice' },
      { id: 'bob', name: 'bob' },
      { id: 'carol', name: 'carol' },
    ]
    const expenses = [
      splitExpense('e1', 9500, [
        ['alice', 1],
        ['bob', 1],
        ['carol', 1],
      ]),
      splitExpense(
        'e2',
        3300,
        [
          ['alice', 3333],
          ['bob', 3333],
          ['carol', 3334],
        ],
        'BY_PERCENTAGE',
      ),
    ]

    const result = getSpendingByParticipant(participants, expenses)

    expect(result.reduce((sum, { share }) => sum + share, 0)).toBe(
      getTotalGroupSpending(expenses),
    )
  })
})
