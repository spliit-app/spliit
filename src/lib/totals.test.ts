import { calculateShare, calculateShares } from './totals'

const p1 = { id: 'p1', name: 'Participant 1' }
const p2 = { id: 'p2', name: 'Participant 2' }
const p3 = { id: 'p3', name: 'Participant 3' }

const expenseBase = {
  amount: 10000,
  isReimbursement: false,
  paidBy: p1,
  expenseDate: new Date('2024-01-01T00:00:00.000Z'),
}

function sumShares(shares: Record<string, number>) {
  return Object.values(shares).reduce((sum, value) => sum + value, 0)
}

describe('calculateShares', () => {
  it('splits evenly and assigns remainder cents deterministically', () => {
    const shares = calculateShares({
      ...expenseBase,
      amount: 100,
      splitMode: 'EVENLY' as const,
      paidFor: [
        { participant: p1, shares: 1 },
        { participant: p2, shares: 1 },
        { participant: p3, shares: 1 },
      ],
    })

    expect(shares).toEqual({ p1: 33, p2: 33, p3: 34 })
    expect(sumShares(shares)).toBe(100)
  })

  it('handles negative expense amounts', () => {
    const shares = calculateShares({
      ...expenseBase,
      amount: -101,
      splitMode: 'EVENLY' as const,
      paidFor: [
        { participant: p1, shares: 1 },
        { participant: p2, shares: 1 },
        { participant: p3, shares: 1 },
      ],
    })

    expect(shares).toEqual({ p1: -33, p2: -34, p3: -34 })
    expect(sumShares(shares)).toBe(-101)
  })

  it('uses exact custom amount shares and assigns mismatched remainder to payer', () => {
    const shares = calculateShares({
      ...expenseBase,
      splitMode: 'BY_AMOUNT',
      paidFor: [
        { participant: p1, shares: 4000 },
        { participant: p2, shares: 4000 },
      ],
    })

    expect(shares).toEqual({ p1: 6000, p2: 4000 })
    expect(sumShares(shares)).toBe(10000)
  })

  it('splits by shares', () => {
    const shares = calculateShares({
      ...expenseBase,
      splitMode: 'BY_SHARES',
      paidFor: [
        { participant: p1, shares: 2 },
        { participant: p2, shares: 1 },
        { participant: p3, shares: 1 },
      ],
    })

    expect(shares).toEqual({ p1: 5000, p2: 2500, p3: 2500 })
  })

  it('splits by percentage using basis points', () => {
    const shares = calculateShares({
      ...expenseBase,
      splitMode: 'BY_PERCENTAGE',
      paidFor: [
        { participant: p1, shares: 5000 },
        { participant: p2, shares: 2500 },
        { participant: p3, shares: 2500 },
      ],
    })

    expect(shares).toEqual({ p1: 5000, p2: 2500, p3: 2500 })
  })

  it('includes reimbursements in participant share calculation', () => {
    const expense = {
      ...expenseBase,
      isReimbursement: true,
      splitMode: 'EVENLY' as const,
      paidFor: [{ participant: p2, shares: 1 }],
      paidBy: p1,
    }

    expect(calculateShares(expense)).toEqual({ p2: 10000 })
    expect(calculateShare('p2', expense)).toBe(10000)
    expect(calculateShare('p1', expense)).toBe(0)
  })

  it('falls back to payer when paidFor is empty', () => {
    const shares = calculateShares({
      ...expenseBase,
      splitMode: 'EVENLY',
      paidFor: [],
    })

    expect(shares).toEqual({ p1: 10000 })
  })

  it('handles zero total shares without losing cents', () => {
    const shares = calculateShares({
      ...expenseBase,
      splitMode: 'BY_SHARES',
      paidFor: [
        { participant: p1, shares: 0 },
        { participant: p2, shares: 0 },
      ],
    })

    expect(sumShares(shares)).toBe(10000)
    expect(Object.values(shares).every((value) => value >= 0)).toBe(true)
  })
})
