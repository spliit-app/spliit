'use client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Currency } from '@/lib/currency'
import { RecurringSpending } from '@/lib/totals'
import { formatCurrency } from '@/lib/utils'
import { useLocale, useTranslations } from 'next-intl'

type Props = {
  recurring?: RecurringSpending
  currency?: Currency
}

export function RecurringSpendingStats({ recurring, currency }: Props) {
  const t = useTranslations('Stats.Recurring')

  // Keep the stats page uncluttered for groups that have no recurring
  // expenses: only render the card once we know there is something to show.
  if (recurring && recurring.count === 0) return null

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {!recurring || !currency ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
        ) : (
          <RecurringSummary stats={recurring} currency={currency} />
        )}
      </CardContent>
    </Card>
  )
}

function RecurringSummary({
  stats,
  currency,
}: {
  stats: RecurringSpending
  currency: Currency
}) {
  const locale = useLocale()
  const t = useTranslations('Stats.Recurring')

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-muted-foreground">{t('estimatedMonthly')}</div>
        <div className="text-lg">
          {formatCurrency(currency, stats.estimatedMonthly, locale)}
        </div>
        <div className="text-sm text-muted-foreground">
          {t('estimatedYearly', {
            amount: formatCurrency(currency, stats.estimatedYearly, locale),
          })}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {stats.byPeriod.map((period) => (
          <div
            key={period.period}
            className="flex items-center justify-between gap-2 text-sm"
          >
            <span className="text-muted-foreground">
              {t(`period.${period.period}`, { count: period.count })}
            </span>
            <span className="tabular-nums">
              {formatCurrency(currency, period.total, locale)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
