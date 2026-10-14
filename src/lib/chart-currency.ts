import { amountAsDecimal, formatCurrency } from './utils'

type ChartCurrency = Parameters<typeof formatCurrency>[0]

export function formatChartCurrency({
  amount,
  currency,
  locale,
  roundAmounts,
}: {
  amount: number
  currency: ChartCurrency
  locale: string
  roundAmounts: boolean
}) {
  if (!roundAmounts) return formatCurrency(currency, amount, locale)

  const formattedAmount = amountAsDecimal(amount, currency)
  const format = new Intl.NumberFormat(locale, {
    currency: currency.code.length ? currency.code : 'USD',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: 'currency',
  })

  if (currency.code.length) return format.format(formattedAmount)

  return format
    .formatToParts(formattedAmount)
    .map((part) => (part.type === 'currency' ? currency.symbol : part.value))
    .join('')
}
