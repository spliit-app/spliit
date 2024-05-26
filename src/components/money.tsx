'use client'
import { cn, formatCurrency } from '@/lib/utils'

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
      {formatCurrency(currency, amount)}
    </span>
  )
}
