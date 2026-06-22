import {
  calculateShare,
  getTotalActiveUserPaidFor,
  getTotalActiveUserShare,
  getTotalGroupSpending,
} from './totals'

type TotalsExpense = Parameters<typeof getTotalActiveUserPaidFor>[1][number]

type ShareExpense = Parameters<typeof calculateShare>[1]

type PaidFor = ShareExpense['paidFor'][number]

const makeExpense = (overrides: Partial<TotalsExpense>): TotalsExpense =>
  ({
    id: 'e1',
    expenseDate: new Date('2025-01-01T00:00:00.000Z'),
    title: 'Dinner',
    amount: 0,
    isReimbursement: false,
    splitMode: 'EVENLY',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    recurrenceRule: null,
    category: null,
    paidBy: { id: 'u1', name: 'User 1' },
    paidFor: [
      {
        participant: { id: 'u1', name: 'User 1' },
        shares: 1,
      },
    ],
    _count: { documents: 0 },
    ...overrides,
  }) as TotalsExpense

const makePaidFor = (participantId: string, shares: number): PaidFor =>
  ({
    participant: { id: participantId, name: participantId },
    shares,
  }) as PaidFor

describe('getTotalGroupSpending', () => {
  it('sums all non-reimbursement expenses', () => {
    const expenses = [
      makeExpense({ id: 'e1', amount: 100, isReimbursement: false }),
      makeExpense({ id: 'e2', amount: 250, isReimbursement: false }),
      makeExpense({ id: 'e3', amount: 50, isReimbursement: false }),
    ]

    expect(getTotalGroupSpending(expenses)).toBe(400)
  })

  it('excludes reimbursements from total spending', () => {
    const expenses = [
      makeExpense({ id: 'e1', amount: 100, isReimbursement: false }),
      makeExpense({ id: 'e2', amount: 999, isReimbursement: true }),
      makeExpense({ id: 'e3', amount: 250, isReimbursement: false }),
    ]

    expect(getTotalGroupSpending(expenses)).toBe(350)
  })

  it('handles empty array', () => {
    const expenses: TotalsExpense[] = []

    expect(getTotalGroupSpending(expenses)).toBe(0)
  })
})

describe('getTotalActiveUserPaidFor', () => {
  it('sums amounts paid by active user', () => {
    const expenses: TotalsExpense[] = [
      makeExpense({
        id: 'e1',
        amount: 1250,
        paidBy: { id: 'u1', name: 'User 1' },
      }),
      makeExpense({
        id: 'e2',
        amount: 600,
        paidBy: { id: 'u2', name: 'User 2' },
      }),
      makeExpense({
        id: 'e3',
        amount: 775,
        paidBy: { id: 'u1', name: 'User 1' },
      }),
    ]

    expect(getTotalActiveUserPaidFor('u1', expenses)).toBe(2025)
  })

  it('excludes reimbursements even if paid by active user', () => {
    const expenses: TotalsExpense[] = [
      makeExpense({
        id: 'e1',
        amount: 1000,
        isReimbursement: false,
        paidBy: { id: 'u1', name: 'User 1' },
      }),
      makeExpense({
        id: 'e2',
        amount: 500,
        isReimbursement: true,
        paidBy: { id: 'u1', name: 'User 1' },
      }),
    ]

    expect(getTotalActiveUserPaidFor('u1', expenses)).toBe(1000)
  })

  it('returns 0 when active user is null', () => {
    const expenses: TotalsExpense[] = [makeExpense({ id: 'e1', amount: 1000 })]

    expect(getTotalActiveUserPaidFor(null, expenses)).toBe(0)
  })
})

describe('getTotalActiveUserShare', () => {
  it('sums active user shares across expenses', () => {
    const expenses: TotalsExpense[] = [
      makeExpense({
        id: 'e1',
        amount: 100,
        isReimbursement: false,
        splitMode: 'EVENLY',
        paidFor: [
          makePaidFor('u1', 1),
          makePaidFor('u2', 1),
          makePaidFor('u3', 1),
        ],
      }),
      makeExpense({
        id: 'e2',
        amount: 90,
        isReimbursement: false,
        splitMode: 'BY_AMOUNT',
        paidFor: [makePaidFor('u1', 30), makePaidFor('u2', 60)],
      }),
      makeExpense({
        id: 'e3',
        amount: 50,
        isReimbursement: false,
        splitMode: 'EVENLY',
        paidFor: [makePaidFor('u1', 1), makePaidFor('u2', 1)],
      }),
    ]

    expect(getTotalActiveUserShare('u1', expenses)).toBeCloseTo(
      100 / 3 + 30 + 25,
      2,
    )
  })

  it('rounds total share to 2 decimals', () => {
    const expenses: TotalsExpense[] = [
      makeExpense({
        id: 'e1',
        amount: 100,
        splitMode: 'EVENLY',
        paidFor: [
          makePaidFor('u1', 1),
          makePaidFor('u2', 1),
          makePaidFor('u3', 1),
        ],
      }),
      makeExpense({
        id: 'e2',
        amount: 1,
        splitMode: 'EVENLY',
        paidFor: [
          makePaidFor('u1', 1),
          makePaidFor('u2', 1),
          makePaidFor('u3', 1),
        ],
      }),
    ]

    const total = getTotalActiveUserShare('u1', expenses)

    expect(total).toBe(33.67)
    expect(total.toFixed(2)).toBe('33.67')
  })
})

describe('calculateShare', () => {
  it('returns 0 for reimbursements', () => {
    const expense: ShareExpense = {
      amount: 100,
      isReimbursement: true,
      splitMode: 'EVENLY',
      paidFor: [makePaidFor('u1', 1), makePaidFor('u2', 1)],
    }

    expect(calculateShare('u1', expense)).toBe(0)
    expect(calculateShare('u2', expense)).toBe(0)
  })

  it('returns 0 if participant not in paidFor', () => {
    const expense: ShareExpense = {
      amount: 100,
      isReimbursement: false,
      splitMode: 'EVENLY',
      paidFor: [makePaidFor('u1', 1), makePaidFor('u2', 1)],
    }

    expect(calculateShare('u3', expense)).toBe(0)
  })

  it('EVENLY divides expense amount by participants', () => {
    const expense: ShareExpense = {
      amount: 100,
      isReimbursement: false,
      splitMode: 'EVENLY',
      paidFor: [
        makePaidFor('u1', 1),
        makePaidFor('u2', 1),
        makePaidFor('u3', 1),
      ],
    }

    expect(calculateShare('u1', expense)).toBeCloseTo(100 / 3)
    expect(calculateShare('u2', expense)).toBeCloseTo(100 / 3)
    expect(calculateShare('u3', expense)).toBeCloseTo(100 / 3)
  })

  it('BY_AMOUNT returns exact share amount', () => {
    const expense: ShareExpense = {
      amount: 999,
      isReimbursement: false,
      splitMode: 'BY_AMOUNT',
      paidFor: [makePaidFor('u1', 123), makePaidFor('u2', 456)],
    }

    expect(calculateShare('u1', expense)).toBe(123)
    expect(calculateShare('u2', expense)).toBe(456)
  })

  it('BY_PERCENTAGE calculates share using shares/10000', () => {
    const expense: ShareExpense = {
      amount: 1000,
      isReimbursement: false,
      splitMode: 'BY_PERCENTAGE',
      paidFor: [makePaidFor('u1', 2500), makePaidFor('u2', 7500)],
    }

    expect(calculateShare('u1', expense)).toBe(250)
    expect(calculateShare('u2', expense)).toBe(750)
  })

  it('BY_SHARES weights shares by ratio', () => {
    const expense: ShareExpense = {
      amount: 600,
      isReimbursement: false,
      splitMode: 'BY_SHARES',
      paidFor: [
        makePaidFor('u1', 1),
        makePaidFor('u2', 2),
        makePaidFor('u3', 3),
      ],
    }

    expect(calculateShare('u1', expense)).toBe(100)
    expect(calculateShare('u2', expense)).toBe(200)
    expect(calculateShare('u3', expense)).toBe(300)
  })
})
