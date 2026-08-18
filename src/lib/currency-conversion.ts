import { Currency } from './currency'

/**
 * Conversion rates are always expressed as "1 original currency = `rate` group currency",
 * matching how `useCurrencyRate` queries the API (the original currency is the base).
 */
function isUsableRate(rate: number) {
  return Number.isFinite(rate) && rate > 0
}

/**
 * Converts an amount given in the expense's original currency into the group currency.
 * This is the direction used for regular expenses: the user enters what they actually
 * spent abroad, and the group-currency amount follows.
 *
 * @returns the converted amount as a string with the group currency's decimal digits,
 * or `null` if the inputs cannot produce a meaningful result.
 */
export function convertToGroupCurrency(
  originalAmount: number,
  rate: number,
  groupCurrency: Currency,
): string | null {
  if (!Number.isFinite(originalAmount) || !isUsableRate(rate)) return null
  const converted = originalAmount * rate
  if (!Number.isFinite(converted)) return null
  return converted.toFixed(groupCurrency.decimal_digits)
}

/**
 * Converts an amount given in the group currency into the expense's original currency.
 * This is the direction used for repayments: the group-currency amount is fixed by the
 * balance being settled, and the amount to actually transfer follows.
 *
 * The result is rounded to the original currency's decimal digits, so converting it back
 * will not always yield the exact group-currency amount. That is intentional: the
 * group-currency amount stays the authoritative figure, and the original amount is only
 * recorded for reference.
 *
 * @returns the converted amount as a string with the original currency's decimal digits,
 * or `null` if the inputs cannot produce a meaningful result.
 */
export function convertToOriginalCurrency(
  groupAmount: number,
  rate: number,
  originalCurrency: Currency,
): string | null {
  if (!Number.isFinite(groupAmount) || !isUsableRate(rate)) return null
  const converted = groupAmount / rate
  if (!Number.isFinite(converted)) return null
  return converted.toFixed(originalCurrency.decimal_digits)
}
