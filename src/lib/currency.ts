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
  'MKD',
  'MXN',
  'MYR',
  'NZD',
  'PHP',
  'SGD',
  'THB',
  'VND',
  'ZAR',
  'COP',
  'MAD',
  'AED',
  'AFN',
  'ALL',
  'AMD',
  'ARS',
  'AZN',
  'BAM',
  'BDT',
  'BHD',
  'BIF',
  'BND',
  'BOB',
  'BWP',
  'BYN',
  'BZD',
  'CDF',
  'CLP',
  'CRC',
  'CVE',
  'DJF',
  'DOP',
  'DZD',
  'EGP',
  'ERN',
  'ETB',
  'GEL',
  'GHS',
  'GNF',
  'GTQ',
  'HNL',
  'IQD',
  'IRR',
  'JMD',
  'JOD',
  'KES',
  'KHR',
  'KMF',
  'KWD',
  'KZT',
  'LBP',
  'LKR',
  'LYD',
  'MDL',
  'MGA',
  'MMK',
  'MOP',
  'MUR',
  'MZN',
  'NAD',
  'NGN',
  'NIO',
  'NPR',
  'OMR',
  'PAB',
  'PEN',
  'PKR',
  'PYG',
  'QAR',
  'RSD',
  'RUB',
  'RWF',
  'SAR',
  'SDG',
  'SOS',
  'SYP',
  'TND',
  'TOP',
  'TTD',
  'TWD',
  'TZS',
  'UAH',
  'UGX',
  'UYU',
  'UZS',
  'XAF',
  'XOF',
  'YER',
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
