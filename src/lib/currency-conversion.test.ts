import { getCurrency } from './currency'
import {
  convertToGroupCurrency,
  convertToOriginalCurrency,
} from './currency-conversion'

const EUR = getCurrency('EUR')
const THB = getCurrency('THB')
/** Has no minor units in practice */
const JPY = getCurrency('JPY')

describe('convertToGroupCurrency', () => {
  it('converts using the rate and rounds to the group currency', () => {
    // 1 EUR = 38.4 THB
    expect(convertToGroupCurrency(130.21, 38.4, THB)).toBe('5000.06')
  })

  it('rounds to the group currency decimal digits', () => {
    expect(convertToGroupCurrency(10, 163.456, JPY)).toBe('1635')
  })

  it('supports negative amounts (income)', () => {
    expect(convertToGroupCurrency(-10, 38.4, THB)).toBe('-384.00')
  })

  it.each([0, -1, NaN, Infinity])('rejects the rate %p', (rate) => {
    expect(convertToGroupCurrency(100, rate, THB)).toBeNull()
  })

  it('rejects a non-numeric amount', () => {
    expect(convertToGroupCurrency(NaN, 38.4, THB)).toBeNull()
  })
})

describe('convertToOriginalCurrency', () => {
  it('converts back and rounds to the original currency', () => {
    // Settling ฿5,000 at 1 EUR = 38.4 THB
    expect(convertToOriginalCurrency(5000, 38.4, EUR)).toBe('130.21')
  })

  it('rounds to the original currency decimal digits', () => {
    // 1 JPY = 0.0064 EUR
    expect(convertToOriginalCurrency(100, 0.0064, JPY)).toBe('15625')
  })

  it.each([0, -1, NaN, Infinity])('rejects the rate %p', (rate) => {
    expect(convertToOriginalCurrency(100, rate, EUR)).toBeNull()
  })

  it('rejects a non-numeric amount', () => {
    expect(convertToOriginalCurrency(NaN, 38.4, EUR)).toBeNull()
  })
})

describe('round trip', () => {
  /**
   * The original amount is rounded to its own currency, so converting it back does not
   * always yield the exact group amount. The drift must stay below one minor unit of the
   * original currency expressed in the group currency.
   */
  it.each([
    [5000, 38.4],
    [1234.56, 0.87],
    [99.99, 1.0921],
    [1, 145.3],
  ])('stays within one minor unit for %p at rate %p', (groupAmount, rate) => {
    const original = convertToOriginalCurrency(groupAmount, rate, EUR)
    expect(original).not.toBeNull()
    const roundTripped = convertToGroupCurrency(Number(original), rate, THB)
    expect(roundTripped).not.toBeNull()
    const drift = Math.abs(Number(roundTripped) - groupAmount)
    expect(drift).toBeLessThanOrEqual(
      (rate / 10 ** EUR.decimal_digits / 2) * 1.000001,
    )
  })
})
