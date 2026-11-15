import { balanceDisplay, expenseDisplay, formatAmount } from '@/mcp/display'

describe('formatAmount', () => {
  it('formats minor units with the group currency', () => {
    expect(formatAmount({ currency: '$', currencyCode: 'USD' }, 3000)).toBe(
      '$30.00',
    )
    expect(formatAmount({ currency: '$', currencyCode: null }, 3000)).toBe(
      '$30.00',
    )
  })

  it('honours zero-decimal currencies', () => {
    expect(formatAmount({ currency: '¥', currencyCode: 'JPY' }, 1000)).toBe(
      '¥1,000',
    )
  })
})

describe('expenseDisplay', () => {
  it('formats the group amount and an original amount', () => {
    expect(
      expenseDisplay(
        { currency: '$', currencyCode: 'USD' },
        { amount: 3000, originalAmount: 2750, originalCurrency: 'EUR' },
      ),
    ).toEqual({ amount: '$30.00', originalAmount: '€27.50' })
  })

  it('omits originalAmount when it is absent', () => {
    expect(
      expenseDisplay(
        { currency: '$', currencyCode: 'USD' },
        { amount: 3000, originalAmount: null, originalCurrency: null },
      ),
    ).toEqual({ amount: '$30.00' })
  })
})

describe('balanceDisplay', () => {
  it('formats every balance component', () => {
    expect(
      balanceDisplay(
        { currency: '$', currencyCode: 'USD' },
        { alice: { paid: 3000, paidFor: 1000, total: 2000 } },
      ),
    ).toEqual({
      alice: {
        paid: '$30.00',
        paidFor: '$10.00',
        total: '$20.00',
      },
    })
  })
})
