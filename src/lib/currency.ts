import { Locale } from '@/i18n/request'
import currencyList from './currency-data.json'

export type Currency = {
  name: string
  symbol_native: string
  symbol: string
  code: string
  name_plural: string
  rounding: number
  decimal_digits: number
}

export const supportedCurrencyCodes = [
  'USD',
  'EUR',
  'JPY',
  'BGN',
  'CZK',
  'DKK',
  'GBP',
  'HUF',
  'PLN',
  'RON',
  'SEK',
  'CHF',
  'ISK',
  'NOK',
  'TRY',
  'AUD',
  'BRL',
  'CAD',
  'CNY',
  'HKD',
  'IDR',
  'ILS',
  'INR',
  'KRW',
  'MXN',
  'NZD',
  'PHP',
  'SGD',
  'THB',
  'ZAR',
] as const
export type supportedCurrencyCodeType = (typeof supportedCurrencyCodes)[number]

export function defaultCurrencyList(
  locale: Locale = 'en-US',
  customChoice: string | null = null,
) {
  const currencies = customChoice
    ? [
        {
          name: customChoice,
          symbol_native: '',
          symbol: '',
          code: '',
          name_plural: customChoice,
          rounding: 0,
          decimal_digits: 2,
        },
      ]
    : []
  const allCurrencies = currencyList[locale]
  return currencies.concat(Object.values(allCurrencies))
}

export function getCurrency(
  currencyCode: string | undefined | null,
  locale: Locale = 'en-US',
  customChoice = 'Custom',
): Currency {
  const defaultCurrency = {
    name: customChoice,
    symbol_native: '',
    symbol: '',
    code: '',
    name_plural: customChoice,
    rounding: 0,
    decimal_digits: 2,
  }
  if (!currencyCode || currencyCode === '') return defaultCurrency
  const currencyListInLocale = currencyList[locale] ?? currencyList['en-US']
  return (
    currencyListInLocale[currencyCode as supportedCurrencyCodeType] ??
    defaultCurrency
  )
}
