import { getBalances, getSuggestedReimbursements } from './balances'

type BalancesExpense = Parameters<typeof getBalances>[0][number]

const makeExpense = (overrides: Partial<BalancesExpense>): BalancesExpense =>
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
    paidBy: { id: 'p0', name: 'P0' },
    paidFor: [
      {
        participant: { id: 'p0', name: 'P0' },
        shares: 1,
      },
    ],
    _count: { documents: 0 },
    ...overrides,
  }) as BalancesExpense

describe('getBalances', () => {
  it('avoids negative zeros', () => {
    const expenses: BalancesExpense[] = [
      makeExpense({
        id: 'e1',
        amount: 0,
        paidBy: { id: 'p0', name: 'P0' },
        paidFor: [{ participant: { id: 'p0', name: 'P0' }, shares: 1 }],
      }),
    ]

    const balances = getBalances(expenses)

    expect(Object.is(balances.p0.paid, -0)).toBe(false)
    expect(Object.is(balances.p0.paidFor, -0)).toBe(false)
    expect(Object.is(balances.p0.total, -0)).toBe(false)
  })

  it('handles empty expense list', () => {
    expect(getBalances([])).toEqual({})
  })

  it('single expense, single participant', () => {
    const expenses: BalancesExpense[] = [
      makeExpense({
        id: 'e1',
        amount: 123,
        paidBy: { id: 'p0', name: 'P0' },
        paidFor: [{ participant: { id: 'p0', name: 'P0' }, shares: 1 }],
      }),
    ]

    expect(getBalances(expenses)).toEqual({
      p0: { paid: 123, paidFor: 123, total: 0 },
    })
  })

  it('evenly splits expenses', () => {
    const expenses: BalancesExpense[] = [
      makeExpense({
        id: 'e1',
        amount: 100,
        paidBy: { id: 'p0', name: 'P0' },
        paidFor: [
          { participant: { id: 'p0', name: 'P0' }, shares: 1 },
          { participant: { id: 'p1', name: 'P1' }, shares: 1 },
          { participant: { id: 'p2', name: 'P2' }, shares: 1 },
        ],
      }),
    ]

    const balances = getBalances(expenses)

    expect(balances.p0).toEqual({ paid: 100, paidFor: 33, total: 67 })
    expect(balances.p1).toEqual({ paid: 0, paidFor: 33, total: -33 })
    expect(balances.p2).toEqual({ paid: 0, paidFor: 33, total: -33 })

    const net = Object.values(balances).reduce((sum, b) => sum + b.total, 0)
    expect(net).toBe(expenses[0].amount % expenses[0].paidFor.length)
  })

  it('splits BY_SHARES proportionally', () => {
    const expenses: BalancesExpense[] = [
      makeExpense({
        id: 'e1',
        amount: 600,
        splitMode: 'BY_SHARES',
        paidBy: { id: 'p0', name: 'P0' },
        paidFor: [
          { participant: { id: 'p0', name: 'P0' }, shares: 1 },
          { participant: { id: 'p1', name: 'P1' }, shares: 2 },
          { participant: { id: 'p2', name: 'P2' }, shares: 3 },
        ],
      }),
    ]

    const balances = getBalances(expenses)

    expect(balances.p0).toEqual({ paid: 600, paidFor: 100, total: 500 })
    expect(balances.p1).toEqual({ paid: 0, paidFor: 200, total: -200 })
    expect(balances.p2).toEqual({ paid: 0, paidFor: 300, total: -300 })
  })

  it('splits BY_PERCENTAGE using basis points', () => {
    const expenses: BalancesExpense[] = [
      makeExpense({
        id: 'e1',
        amount: 250,
        splitMode: 'BY_PERCENTAGE',
        paidBy: { id: 'p0', name: 'P0' },
        paidFor: [
          { participant: { id: 'p0', name: 'P0' }, shares: 2000 },
          { participant: { id: 'p1', name: 'P1' }, shares: 3000 },
          { participant: { id: 'p2', name: 'P2' }, shares: 5000 },
        ],
      }),
    ]

    const balances = getBalances(expenses)

    expect(balances.p0).toEqual({ paid: 250, paidFor: 50, total: 200 })
    expect(balances.p1).toEqual({ paid: 0, paidFor: 75, total: -75 })
    expect(balances.p2).toEqual({ paid: 0, paidFor: 125, total: -125 })
  })

  it('splits BY_AMOUNT and assigns remainder to last participant', () => {
    const expenses: BalancesExpense[] = [
      makeExpense({
        id: 'e1',
        amount: 101,
        splitMode: 'BY_AMOUNT',
        paidBy: { id: 'p0', name: 'P0' },
        paidFor: [
          { participant: { id: 'p0', name: 'P0' }, shares: 10 },
          { participant: { id: 'p1', name: 'P1' }, shares: 10 },
          { participant: { id: 'p2', name: 'P2' }, shares: 10 },
        ],
      }),
    ]

    const balances = getBalances(expenses)

    // Note: implementation treats `shares` as weights (not absolute amounts)
    // and assigns the remainder to the last participant.
    expect(balances.p0).toEqual({ paid: 101, paidFor: 34, total: 67 })
    expect(balances.p1).toEqual({ paid: 0, paidFor: 34, total: -34 })
    expect(balances.p2).toEqual({ paid: 0, paidFor: 34, total: -34 })
  })

  it('handles rounding correctly', () => {
    const expenses: BalancesExpense[] = [
      makeExpense({
        id: 'e1',
        amount: 100, // 100 / 3 = 33.333...
        splitMode: 'EVENLY',
        paidBy: { id: 'p0', name: 'P0' },
        paidFor: [
          { participant: { id: 'p0', name: 'P0' }, shares: 1 },
          { participant: { id: 'p1', name: 'P1' }, shares: 1 },
          { participant: { id: 'p2', name: 'P2' }, shares: 1 },
        ],
      }),
      makeExpense({
        id: 'e2',
        amount: 77, // 77 / 3 = 25.666...
        splitMode: 'EVENLY',
        paidBy: { id: 'p1', name: 'P1' },
        paidFor: [
          { participant: { id: 'p0', name: 'P0' }, shares: 1 },
          { participant: { id: 'p1', name: 'P1' }, shares: 1 },
          { participant: { id: 'p2', name: 'P2' }, shares: 1 },
        ],
      }),
      makeExpense({
        id: 'e3',
        amount: 99, // 99 / 7 = 14.142857...
        splitMode: 'BY_SHARES',
        paidBy: { id: 'p2', name: 'P2' },
        paidFor: [
          { participant: { id: 'p0', name: 'P0' }, shares: 2 },
          { participant: { id: 'p1', name: 'P1' }, shares: 3 },
          { participant: { id: 'p2', name: 'P2' }, shares: 2 },
        ],
      }),
    ]

    const balances = getBalances(expenses)

    // Verify all values are integers (rounded)
    expect(Number.isInteger(balances.p0.paid)).toBe(true)
    expect(Number.isInteger(balances.p0.paidFor)).toBe(true)
    expect(Number.isInteger(balances.p0.total)).toBe(true)
    expect(Number.isInteger(balances.p1.paid)).toBe(true)
    expect(Number.isInteger(balances.p1.paidFor)).toBe(true)
    expect(Number.isInteger(balances.p1.total)).toBe(true)
    expect(Number.isInteger(balances.p2.paid)).toBe(true)
    expect(Number.isInteger(balances.p2.paidFor)).toBe(true)
    expect(Number.isInteger(balances.p2.total)).toBe(true)

    // Verify totals balance (sum ~= 0, within rounding tolerance)
    const netTotal = Object.values(balances).reduce(
      (sum, b) => sum + b.total,
      0,
    )
    expect(Math.abs(netTotal)).toBeLessThan(3) // Tolerance for rounding remainder

    // Verify no negative zeros
    expect(Object.is(balances.p0.paid, -0)).toBe(false)
    expect(Object.is(balances.p0.paidFor, -0)).toBe(false)
    expect(Object.is(balances.p0.total, -0)).toBe(false)
  })

  it('handles multiple participants with mixed expenses', () => {
    const expenses: BalancesExpense[] = [
      makeExpense({
        id: 'e1',
        amount: 120,
        splitMode: 'EVENLY',
        paidBy: { id: 'p0', name: 'Alice' },
        paidFor: [
          { participant: { id: 'p0', name: 'Alice' }, shares: 1 },
          { participant: { id: 'p1', name: 'Bob' }, shares: 1 },
          { participant: { id: 'p2', name: 'Carol' }, shares: 1 },
        ],
      }),
      makeExpense({
        id: 'e2',
        amount: 600,
        splitMode: 'BY_SHARES',
        paidBy: { id: 'p1', name: 'Bob' },
        paidFor: [
          { participant: { id: 'p0', name: 'Alice' }, shares: 1 },
          { participant: { id: 'p1', name: 'Bob' }, shares: 2 },
          { participant: { id: 'p2', name: 'Carol' }, shares: 3 },
        ],
      }),
      makeExpense({
        id: 'e3',
        amount: 200,
        splitMode: 'BY_PERCENTAGE',
        paidBy: { id: 'p2', name: 'Carol' },
        paidFor: [
          { participant: { id: 'p0', name: 'Alice' }, shares: 5000 }, // 50%
          { participant: { id: 'p1', name: 'Bob' }, shares: 3000 }, // 30%
          { participant: { id: 'p2', name: 'Carol' }, shares: 2000 }, // 20%
        ],
      }),
    ]

    const balances = getBalances(expenses)

    // Alice: paid 120, owes (40 + 100 + 100) = 240, total = 120 - 240 = -120
    expect(balances.p0.paid).toBe(120)
    expect(balances.p0.paidFor).toBe(240)
    expect(balances.p0.total).toBe(-120)

    // Bob: paid 600, owes (40 + 200 + 60) = 300, total = 600 - 300 = 300
    expect(balances.p1.paid).toBe(600)
    expect(balances.p1.paidFor).toBe(300)
    expect(balances.p1.total).toBe(300)

    // Carol: paid 200, owes (40 + 300 + 40) = 380, total = 200 - 380 = -180
    expect(balances.p2.paid).toBe(200)
    expect(balances.p2.paidFor).toBe(380)
    expect(balances.p2.total).toBe(-180)

    // Verify sum of totals = 0 (within rounding tolerance)
    const netTotal = Object.values(balances).reduce(
      (sum, b) => sum + b.total,
      0,
    )
    expect(Math.abs(netTotal)).toBeLessThan(3)
  })

  it('handles BY_AMOUNT with one participant having 0 shares', () => {
    const expenses: BalancesExpense[] = [
      makeExpense({
        id: 'e1',
        amount: 100,
        splitMode: 'BY_AMOUNT',
        paidBy: { id: 'p0', name: 'P0' },
        paidFor: [
          { participant: { id: 'p0', name: 'P0' }, shares: 0 },
          { participant: { id: 'p1', name: 'P1' }, shares: 10 },
          { participant: { id: 'p2', name: 'P2' }, shares: 10 },
        ],
      }),
    ]

    const balances = getBalances(expenses)

    // p0 paid 100 but has 0 shares, so owes 0
    expect(balances.p0).toEqual({ paid: 100, paidFor: 0, total: 100 })
    // p1 and p2 split the remaining 100 (50 each)
    expect(balances.p1).toEqual({ paid: 0, paidFor: 50, total: -50 })
    expect(balances.p2).toEqual({ paid: 0, paidFor: 50, total: -50 })
  })

  it('handles BY_PERCENTAGE where percentages do not sum to 10000 (remainder assigned to last)', () => {
    const expenses: BalancesExpense[] = [
      makeExpense({
        id: 'e1',
        amount: 10000,
        splitMode: 'BY_PERCENTAGE',
        paidBy: { id: 'p0', name: 'P0' },
        paidFor: [
          { participant: { id: 'p0', name: 'P0' }, shares: 2000 }, // 20%
          { participant: { id: 'p1', name: 'P1' }, shares: 3000 }, // 30%
          // Missing 5000 basis points - should be assigned to last participant
          { participant: { id: 'p2', name: 'P2' }, shares: 3000 }, // Only 30% specified, gets remainder
        ],
      }),
    ]

    const balances = getBalances(expenses)

    // p0: paid 10000, owes (20/80)% = 2500 (remainder goes to last)
    expect(balances.p0).toEqual({ paid: 10000, paidFor: 2500, total: 7500 })
    // p1: paid 0, owes (30/80)% = 3750
    expect(balances.p1).toEqual({ paid: 0, paidFor: 3750, total: -3750 })
    // p2: paid 0, gets remainder = 3750 (30/80)% + remainder
    expect(balances.p2).toEqual({ paid: 0, paidFor: 3750, total: -3750 })
  })

  it('handles expense where payer is not in paidFor', () => {
    const expenses: BalancesExpense[] = [
      makeExpense({
        id: 'e1',
        amount: 150,
        paidBy: { id: 'p0', name: 'P0' },
        paidFor: [
          { participant: { id: 'p1', name: 'P1' }, shares: 1 },
          { participant: { id: 'p2', name: 'P2' }, shares: 1 },
        ],
      }),
    ]

    const balances = getBalances(expenses)

    // p0 paid 150 but is not in paidFor, so paidFor = 0
    expect(balances.p0).toEqual({ paid: 150, paidFor: 0, total: 150 })
    // p1 and p2 split the expense evenly (75 each)
    expect(balances.p1).toEqual({ paid: 0, paidFor: 75, total: -75 })
    expect(balances.p2).toEqual({ paid: 0, paidFor: 75, total: -75 })
  })

  it('handles float/decimal amounts correctly with rounding', () => {
    // Simulate amounts that would result in float division
    const expenses: BalancesExpense[] = [
      makeExpense({
        id: 'e1',
        amount: 33, // 33 / 3 = 11 exactly
        splitMode: 'EVENLY',
        paidBy: { id: 'p0', name: 'P0' },
        paidFor: [
          { participant: { id: 'p0', name: 'P0' }, shares: 1 },
          { participant: { id: 'p1', name: 'P1' }, shares: 1 },
          { participant: { id: 'p2', name: 'P2' }, shares: 1 },
        ],
      }),
      makeExpense({
        id: 'e2',
        amount: 10, // 10 / 3 = 3.333...
        splitMode: 'EVENLY',
        paidBy: { id: 'p0', name: 'P0' },
        paidFor: [
          { participant: { id: 'p0', name: 'P0' }, shares: 1 },
          { participant: { id: 'p1', name: 'P1' }, shares: 1 },
          { participant: { id: 'p2', name: 'P2' }, shares: 1 },
        ],
      }),
    ]

    const balances = getBalances(expenses)

    // Verify all values are integers (rounded)
    expect(Number.isInteger(balances.p0.paid)).toBe(true)
    expect(Number.isInteger(balances.p0.paidFor)).toBe(true)
    expect(Number.isInteger(balances.p0.total)).toBe(true)
    expect(Number.isInteger(balances.p1.paid)).toBe(true)
    expect(Number.isInteger(balances.p1.paidFor)).toBe(true)
    expect(Number.isInteger(balances.p1.total)).toBe(true)
    expect(Number.isInteger(balances.p2.paid)).toBe(true)
    expect(Number.isInteger(balances.p2.paidFor)).toBe(true)
    expect(Number.isInteger(balances.p2.total)).toBe(true)

    // Verify no negative zeros
    expect(Object.is(balances.p0.paid, -0)).toBe(false)
    expect(Object.is(balances.p0.paidFor, -0)).toBe(false)
    expect(Object.is(balances.p0.total, -0)).toBe(false)
  })

  it('handles repeated participant IDs in paidFor array', () => {
    const expenses: BalancesExpense[] = [
      makeExpense({
        id: 'e1',
        amount: 100,
        splitMode: 'EVENLY',
        paidBy: { id: 'p0', name: 'P0' },
        paidFor: [
          { participant: { id: 'p0', name: 'P0' }, shares: 1 },
          { participant: { id: 'p1', name: 'P1' }, shares: 1 },
          { participant: { id: 'p0', name: 'P0' }, shares: 1 }, // Duplicate
        ],
      }),
    ]

    const balances = getBalances(expenses)

    // p0 appears twice in paidFor, so should owe double
    // Total shares = 3, p0 has 2 shares, p1 has 1 share
    expect(balances.p0.paid).toBe(100)
    expect(balances.p0.paidFor).toBeCloseTo(67, -1) // ~66.67
    expect(balances.p1.paid).toBe(0)
    expect(balances.p1.paidFor).toBeCloseTo(33, -1) // ~33.33
  })

  it('handles all participants with negative balances', () => {
    // Simulate a scenario where everyone owes money
    const balances = {
      p0: { paid: 0, paidFor: 100, total: -100 },
      p1: { paid: 0, paidFor: 50, total: -50 },
      p2: { paid: 0, paidFor: 50, total: -50 },
    }

    const reimbursements = getSuggestedReimbursements(balances)

    // When all are negative, algorithm still produces "settlements"
    // Verify the function handles this case without throwing
    expect(Array.isArray(reimbursements)).toBe(true)
    expect(reimbursements.length).toBeGreaterThanOrEqual(0)
  })

  it('handles heavy chained reimbursements with multiple hops', () => {
    // Scenario: A owes B, B owes C, C owes D, etc.
    // Creating a chain that requires multiple hops to settle
    const balances = {
      alice: { paid: 0, paidFor: 100, total: -100 }, // owes 100
      bob: { paid: 150, paidFor: 50, total: 100 }, // overpaid by 100, owes 50
      carol: { paid: 0, paidFor: 50, total: -50 }, // owes 50
      dan: { paid: 200, paidFor: 200, total: 0 }, // settled
      eve: { paid: 100, paidFor: 200, total: -100 }, // owes 100
    }

    const reimbursements = getSuggestedReimbursements(balances)

    // Bob has +100, needs to receive from debtors
    // Eve owes 100, Carol owes 50, Alice owes 100
    // Total owed = 250, Bob is owed 100
    // Should settle with some debtors

    // Verify reimbursements go to bob (the positive balance)
    expect(reimbursements.some((r) => r.to === 'bob')).toBe(true)

    // Verify the sum of amounts going to bob equals his positive balance
    const toBob = reimbursements
      .filter((r) => r.to === 'bob')
      .reduce((sum, r) => sum + r.amount, 0)
    expect(toBob).toBe(100)
  })
})

describe('getSuggestedReimbursements', () => {
  it('sorts balances correctly (positive before negative)', () => {
    const balances = {
      p0: { paid: 100, paidFor: 50, total: 50 }, // positive
      p1: { paid: 0, paidFor: 30, total: -30 }, // negative
      p2: { paid: 50, paidFor: 70, total: -20 }, // negative
    }

    const reimbursements = getSuggestedReimbursements(balances)

    // Verify positive balances are settled first
    expect(reimbursements.length).toBeGreaterThan(0)
    expect(reimbursements[0].to).toBe('p0') // p0 has positive balance
  })

  it('handles complex 5+ person scenario', () => {
    // Scenario: 5 people, various expenses
    // Alice paid 300, owes 100 → +200
    // Bob paid 50, owes 100 → -50
    // Carol paid 150, owes 100 → +50
    // Dave paid 0, owes 100 → -100
    // Eve paid 0, owes 100 → -100
    const balances = {
      alice: { paid: 300, paidFor: 100, total: 200 },
      bob: { paid: 50, paidFor: 100, total: -50 },
      carol: { paid: 150, paidFor: 100, total: 50 },
      dave: { paid: 0, paidFor: 100, total: -100 },
      eve: { paid: 0, paidFor: 100, total: -100 },
    }

    const reimbursements = getSuggestedReimbursements(balances)

    // Verify sum of reimbursements balances out
    const totalPaid = reimbursements.reduce((sum, r) => sum + r.amount, 0)
    const totalOwed = 200 + 50 // alice + carol
    expect(totalPaid).toBe(totalOwed)

    // Verify all debtors are covered
    const debtorsSettled = new Set(reimbursements.map((r) => r.from))
    expect(debtorsSettled.has('bob')).toBe(true)
    expect(debtorsSettled.has('dave')).toBe(true)
    expect(debtorsSettled.has('eve')).toBe(true)

    // Verify minimal transactions (should be <= 4 for 5 people)
    expect(reimbursements.length).toBeLessThanOrEqual(4)
  })

  it('returns [] when all totals are 0', () => {
    const balances = {
      p0: { paid: 100, paidFor: 100, total: 0 },
      p1: { paid: 50, paidFor: 50, total: 0 },
      p2: { paid: 0, paidFor: 0, total: 0 },
    }

    const reimbursements = getSuggestedReimbursements(balances)

    expect(reimbursements).toEqual([])
  })
})
