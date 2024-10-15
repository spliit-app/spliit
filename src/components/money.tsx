'use client'
import { cn, formatCurrency } from '@/lib/utils'
import { useLocale } from 'next-intl'

type Props = {
  currency: string
  amount: number
  bold?: boolean
  colored?: boolean
  negative?: boolean
}

export function Money({
  currency,
  amount,
  bold = false,
  colored = false,
  negative = false,
}: Props) {
  const locale = useLocale()
  return (
    <span
      className={cn(
        // For reimbursements, we want to be able to force the color
        colored && (amount <= 1 || negative)
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
