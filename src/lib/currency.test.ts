import {
  defaultCurrencyList,
  getCurrency,
  supportedCurrencyCodes,
} from './currency'

describe('Nepalese rupee currency support', () => {
  it('includes NPR in the supported currency codes and selector options', () => {
    expect(supportedCurrencyCodes).toContain('NPR')
    expect(defaultCurrencyList()).toContainEqual(
      expect.objectContaining({ code: 'NPR', name: 'Nepalese Rupee' }),
    )
  })

  it('returns NPR metadata for expense and group currency lookups', () => {
    expect(getCurrency('NPR')).toMatchObject({
      code: 'NPR',
      name: 'Nepalese Rupee',
      name_plural: 'Nepalese rupees',
      decimal_digits: 2,
    })
  })
})
