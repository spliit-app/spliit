import { assertExpenseFormIntegerMinorUnits } from './integer-minor-units'

function expense(
  overrides: {
    amount?: number
    originalAmount?: number | null
    paidFor?: Array<{ shares: number | string }>
  } = {},
) {
  return {
    amount: 1050,
    paidFor: [{ shares: 100 }, { shares: 100 }],
    ...overrides,
  }
}

describe('assertExpenseFormIntegerMinorUnits', () => {
  // createExpense / updateExpense call this before any Prisma write.
  it('accepts integer amount, shares, and a missing originalAmount', () => {
    expect(() => assertExpenseFormIntegerMinorUnits(expense())).not.toThrow()
  })

  it('accepts an integer originalAmount', () => {
    expect(() =>
      assertExpenseFormIntegerMinorUnits(expense({ originalAmount: 800 })),
    ).not.toThrow()
  })

  it('ignores a null originalAmount', () => {
    expect(() =>
      assertExpenseFormIntegerMinorUnits(expense({ originalAmount: null })),
    ).not.toThrow()
  })

  it('treats a trailing .0 as an integer', () => {
    expect(() =>
      assertExpenseFormIntegerMinorUnits(
        expense({
          amount: 10.0,
          originalAmount: 20.0,
          paidFor: [{ shares: 1.0 }],
        }),
      ),
    ).not.toThrow()
  })

  it('accepts numeric share strings that are integers', () => {
    expect(() =>
      assertExpenseFormIntegerMinorUnits(
        expense({ paidFor: [{ shares: '100' }] }),
      ),
    ).not.toThrow()
  })

  it.each([
    ['amount', expense({ amount: 10.5 }), 'amount'],
    ['originalAmount', expense({ originalAmount: 10.5 }), 'originalAmount'],
    [
      'paidFor.shares',
      expense({ paidFor: [{ shares: 1.5 }] }),
      'paidFor.shares',
    ],
    [
      'paidFor.shares as a decimal string',
      expense({ paidFor: [{ shares: '1.5' }] }),
      'paidFor.shares',
    ],
    ['NaN amount', expense({ amount: Number.NaN }), 'amount'],
    [
      'infinite amount',
      expense({ amount: Number.POSITIVE_INFINITY }),
      'amount',
    ],
  ])('rejects a non-integer %s', (_label, values, errorLabel) => {
    expect(() => assertExpenseFormIntegerMinorUnits(values)).toThrow(
      `${errorLabel} must be an integer number of minor units`,
    )
  })
})
