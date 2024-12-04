'use client'
import { cn, formatCurrency } from '@/lib/utils'
import { useLocale, useTranslations } from 'next-intl'

export function TotalsYourShare({
  totalParticipantShare = 0,
  currency,
}: {
  totalParticipantShare?: number
  currency: string
}) {
  const locale = useLocale()
  const t = useTranslations('Stats.Totals')

  return (
    <div>
      <div className="text-muted-foreground">{t('yourShare')}</div>
      <div
        className={cn(
          'text-lg',
          totalParticipantShare < 0 ? 'text-green-600' : 'text-red-600',
        )}
      >
        {formatCurrency(currency, Math.abs(totalParticipantShare), locale)}
      </div>
    </div>
  )
}
