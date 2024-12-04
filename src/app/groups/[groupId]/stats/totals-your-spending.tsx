'use client'
import { cn, formatCurrency } from '@/lib/utils'
import { useLocale, useTranslations } from 'next-intl'

export function TotalsYourSpendings({
  totalParticipantSpendings = 0,
  currency,
}: {
  totalParticipantSpendings?: number
  currency: string
}) {
  const locale = useLocale()
  const t = useTranslations('Stats.Totals')

  const balance =
    totalParticipantSpendings < 0 ? 'yourEarnings' : 'yourSpendings'

  return (
    <div>
      <div className="text-muted-foreground">{t(balance)}</div>

      <div
        className={cn(
          'text-lg',
          totalParticipantSpendings < 0 ? 'text-green-600' : 'text-red-600',
        )}
      >
        {formatCurrency(currency, Math.abs(totalParticipantSpendings), locale)}
      </div>
    </div>
  )
}
