import { normalizeNumberInput } from './number-input'

describe('normalizeNumberInput', () => {
  it('normalizes pasted US currency values', () => {
    expect(normalizeNumberInput('-$1,659.84', { decimalDigits: 2 })).toBe(
      '-1659.84',
    )
  })

  it('treats three trailing digits as grouped money digits', () => {
    expect(normalizeNumberInput('$1,659', { decimalDigits: 2 })).toBe('1659')
  })

  it('normalizes pasted European currency values', () => {
    expect(normalizeNumberInput('-\u20ac1.659,84', { decimalDigits: 2 })).toBe(
      '-1659.84',
    )
  })

  it('preserves comma decimal entry for simple values', () => {
    expect(normalizeNumberInput('1,23')).toBe('1.23')
  })

  it('preserves long decimal entry for conversion rates', () => {
    expect(normalizeNumberInput('1.2345')).toBe('1.2345')
    expect(normalizeNumberInput('1,2345')).toBe('1.2345')
  })

  it('normalizes grouped US and European values', () => {
    expect(normalizeNumberInput('1,234,567.89', { decimalDigits: 2 })).toBe(
      '1234567.89',
    )
    expect(normalizeNumberInput('1.234.567,89', { decimalDigits: 2 })).toBe(
      '1234567.89',
    )
  })
})
