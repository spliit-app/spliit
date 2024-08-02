'use client'
import { cn, formatCurrency } from '@/lib/utils'
import { useLocale } from 'next-intl'

type Props = {
  currency: string
  amount: number
  bold?: boolean
  colored?: boolean
}

export function Money({
  currency,
  amount,
  bold = false,
  colored = false,
}: Props) {
  const locale = useLocale()
  return (
    <span
      className={cn(
        colored && amount <= 1
          ? 'text-red-600'
          : colored && amount >= 1
          ? 'text-green-600'
          : '',
        bold && 'font-bold',
      )}
    >
      {formatCurrency(currency, amount, locale)}
    </span>
  )
}
