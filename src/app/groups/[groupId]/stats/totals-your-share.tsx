'use client'
import { Currency } from '@/lib/currency'
import { cn, formatCurrency } from '@/lib/utils'
import { useLocale, useTranslations } from 'next-intl'

export function TotalsYourShare({
  totalParticipantShare = 0,
  currency,
}: {
  totalParticipantShare?: number
  currency: Currency
}) {
  const locale = useLocale()
  const t = useTranslations('Stats.Totals')

  return (
    <div>
      <div className="text-muted-foreground">{t('yourShare')}</div>
      <div
        className={cn(
          'text-lg',
          totalParticipantShare < 0 ? 'text-credit' : 'text-debt',
        )}
      >
        {formatCurrency(currency, Math.abs(totalParticipantShare), locale)}
      </div>
    </div>
  )
}
