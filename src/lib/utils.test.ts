import { formatCurrency } from './utils'

describe('formatCurrency', () => {
  const currency = 'CUR'
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
    fractions: boolean
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
      result: `${currency}1.23`,
      fractions: true,
    },
    {
      amount: smallAmount,
      locale: `en-US`,
      result: `${currency}1.00`,
      fractions: true,
    },
    {
      amount: largeAmount,
      locale: `en-US`,
      result: `${currency}10,000.00`,
      fractions: true,
    },
    {
      amount: partialAmount,
      locale: `de-DE`,
      result: `1,23${nbsp}${currency}`,
      fractions: true,
    },
    {
      amount: smallAmount,
      locale: `de-DE`,
      result: `1,00${nbsp}${currency}`,
      fractions: true,
    },
    {
      amount: largeAmount,
      locale: `de-DE`,
      result: `10.000,00${nbsp}${currency}`,
      fractions: true,
    },
  ]

  for (const variation of variations) {
    it(`formats ${variation.amount} in ${variation.locale} with fractions as ${variation.fractions}`, () => {
      expect(formatCurrency(currency, variation.amount, variation.locale, variation.fractions)).toBe(
        variation.result,
      )
    })
  }
})
