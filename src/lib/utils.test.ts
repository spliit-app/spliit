import { Currency } from './currency'
import { dateOnlyToLocalDate, formatCurrency, formatDateOnly } from './utils'

describe('formatCurrency', () => {
  const currency: Currency = {
    name: 'Test',
    symbol_native: '',
    symbol: 'CUR',
    code: '',
    name_plural: '',
    rounding: 0,
    decimal_digits: 2,
  }
  /** For testing decimals */
  const partialAmount = 1.23
  /** For testing small full amounts */
  const smallAmount = 1
  /** For testing large full amounts */
  const largeAmount = 10000

  /** Non-breaking space */
  const nbsp = '\xa0'

  interface variation {
    amount: number
    locale: string
    result: string
  }

  /**
   * Variations to be tested, chosen as follows
   * - `en-US` is a very common i18n fallback
   * - `de-DE` exhibited faulty behavior in previous versions
   */
  const variations: variation[] = [
    {
      amount: partialAmount,
      locale: `en-US`,
      result: `${currency.symbol}1.23`,
    },
    {
      amount: smallAmount,
      locale: `en-US`,
      result: `${currency.symbol}1.00`,
    },
    {
      amount: largeAmount,
      locale: `en-US`,
      result: `${currency.symbol}10,000.00`,
    },
    {
      amount: partialAmount,
      locale: `de-DE`,
      result: `1,23${nbsp}${currency.symbol}`,
    },
    {
      amount: smallAmount,
      locale: `de-DE`,
      result: `1,00${nbsp}${currency.symbol}`,
    },
    {
      amount: largeAmount,
      locale: `de-DE`,
      result: `10.000,00${nbsp}${currency.symbol}`,
    },
  ]

  for (const variation of variations) {
    it(`formats ${variation.amount} in ${variation.locale} without fractions`, () => {
      expect(
        formatCurrency(currency, variation.amount * 100, variation.locale),
      ).toBe(variation.result)
    })
    it(`formats ${variation.amount} in ${variation.locale} with fractions`, () => {
      expect(
        formatCurrency(currency, variation.amount, variation.locale, true),
      ).toBe(variation.result)
    })
  }
})

describe('dateOnlyToLocalDate', () => {
  it('keeps the stored calendar day for a DATE column value', () => {
    const date = dateOnlyToLocalDate(new Date('2024-08-01T00:00:00.000Z'))

    expect(date.getFullYear()).toBe(2024)
    expect(date.getMonth()).toBe(7)
    expect(date.getDate()).toBe(1)
  })

  it('does not shift the first of a month into the previous month', () => {
    const date = dateOnlyToLocalDate(new Date('2024-08-01T00:00:00.000Z'))

    expect(date.getMonth()).toBe(7)
  })

  it('keeps the last day of a month on that same day', () => {
    const date = dateOnlyToLocalDate(new Date('2024-08-31T00:00:00.000Z'))

    expect(date.getMonth()).toBe(7)
    expect(date.getDate()).toBe(31)
  })
})

describe('formatDateOnly', () => {
  it('formats a DATE column value on its stored calendar day', () => {
    const formatted = formatDateOnly(
      new Date('2024-08-01T00:00:00.000Z'),
      'en-US',
      { dateStyle: 'medium' },
    )

    expect(formatted).toBe('Aug 1, 2024')
  })
})
