import { Category, Group } from '@/generated/prisma/browser'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Currency, getCurrency } from './currency'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export type DateTimeStyle = NonNullable<
  ConstructorParameters<typeof Intl.DateTimeFormat>[1]
>['dateStyle']
export function formatDate(
  date: Date,
  locale: string,
  options: { dateStyle?: DateTimeStyle; timeStyle?: DateTimeStyle } = {},
) {
  return date.toLocaleString(locale, {
    ...options,
  })
}

/**
 * Converts a date-only field to a date on its own calendar day.
 *
 * Fields stored as DATE type in the database (e.g., expenseDate) come back at
 * UTC midnight. Reading them in the local timezone would shift them to the
 * previous day west of UTC, so the calendar day is taken from the UTC
 * components and rebuilt as a local date.
 *
 * @param date - The date to convert (typically from a database DATE field, e.g., 2025-10-17T00:00:00.000Z)
 * @returns A date at local midnight on the calendar day the field stores
 */
export function dateOnlyToLocalDate(date: Date) {
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

/**
 * Formats a date-only field (without time) for display.
 * Use this for dates stored as DATE type in the database (e.g., expenseDate).
 *
 * @param date - The date to format (typically from a database DATE field, e.g., 2025-10-17T00:00:00.000Z)
 * @param locale - The locale string (e.g., 'en-US', 'fr-FR')
 * @param options - Formatting options (dateStyle, timeStyle)
 * @returns Formatted date string in the specified locale
 */
export function formatDateOnly(
  date: Date,
  locale: string,
  options: { dateStyle?: DateTimeStyle; timeStyle?: DateTimeStyle } = {},
) {
  return dateOnlyToLocalDate(date).toLocaleString(locale, {
    ...options,
  })
}

export function formatCategoryForAIPrompt(category: Category) {
  return `"${category.grouping}/${category.name}" (ID: ${category.id})`
}

/**
 * @param fractions Financial values in this app are generally processed in cents (or equivalent).
 * They are are therefore integer representations of the amount (e.g. 100 for USD 1.00).
 * Set this to `true` if you need to pass a value with decimal fractions instead (e.g. 1.00 for USD 1.00).
 */
export function formatCurrency(
  currency: Currency,
  amount: number,
  locale: string,
  fractions?: boolean,
) {
  const format = new Intl.NumberFormat(locale, {
    minimumFractionDigits: currency.decimal_digits,
    maximumFractionDigits: currency.decimal_digits,
    style: 'currency',
    // '€' will be placed in correct position
    currency: currency.code.length ? currency.code : 'EUR',
  })
  const formatted = format.format(
    fractions ? amount : amountAsDecimal(amount, currency),
  )
  if (currency.code.length) {
    return formatted
  }
  return formatted.replace('€', currency.symbol)
}

export function getCurrencyFromGroup(
  group: Pick<Group, 'currency' | 'currencyCode'>,
): Currency {
  if (!group.currencyCode) {
    return {
      name: 'Custom',
      symbol_native: group.currency,
      symbol: group.currency,
      code: '',
      name_plural: '',
      rounding: 0,
      decimal_digits: 2,
    }
  }
  return getCurrency(group.currencyCode)
}

/**
 * Converts monetary amounts in minor units to the corresponding amount in major units in the given currency.
 * e.g.
 *  - 150 "minor units" of euros = 1.5
 *  - 1000 "minor units" of yen = 1000 (the yen does not have minor units in practice)
 *
 * @param amount The amount, as the number of minor units of currency (cents for most currencies)
 * @param round Whether to round the amount to the nearest minor unit (e.g.: 1.5612 € => 1.56 €)
 */
export function amountAsDecimal(
  amount: number,
  currency: Currency,
  round = false,
) {
  const decimal = amount / 10 ** currency.decimal_digits
  if (round) {
    return Number(decimal.toFixed(currency.decimal_digits))
  }
  return decimal
}

/**
 * Converts decimal monetary amounts in major units to the amount in minor units in the given currency.
 * e.g.
 *  - €1.5 = 150 "minor units" of euros (cents)
 *  - JPY 1000 = 1000 "minor units" of yen (the yen does not have minor units in practice)
 *
 * @param amount The amount in decimal major units (always an integer)
 */
export function amountAsMinorUnits(amount: number, currency: Currency) {
  return Math.round(amount * 10 ** currency.decimal_digits)
}

/**
 * Formats monetary amounts in minor units to the corresponding amount in major units in the given currency,
 * as a string, with correct rounding.
 *
 * @param amount The amount, as the number of minor units of currency (cents for most currencies)
 */
export function formatAmountAsDecimal(amount: number, currency: Currency) {
  return amountAsDecimal(amount, currency).toFixed(currency.decimal_digits)
}

export function formatFileSize(size: number, locale: string) {
  const formatNumber = (num: number) =>
    num.toLocaleString(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    })

  if (size > 1024 ** 3) return `${formatNumber(size / 1024 ** 3)} GB`
  if (size > 1024 ** 2) return `${formatNumber(size / 1024 ** 2)} MB`
  if (size > 1024) return `${formatNumber(size / 1024)} kB`
  return `${formatNumber(size)} B`
}

export function normalizeString(input: string): string {
  // Replaces special characters
  // Input: áäåèéę
  // Output: aaaeee
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}
