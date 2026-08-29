'use client'
import { ExpensesDialog } from '@/app/groups/[groupId]/stats/expenses-dialog'
import {
  StatBar,
  StatBarListSkeleton,
} from '@/app/groups/[groupId]/stats/stat-bar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Currency } from '@/lib/currency'
import { MonthlySpending } from '@/lib/totals'
import { formatCurrency } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { ChevronRight } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'

type Props = {
  groupId: string
  months?: MonthlySpending[]
  currency?: Currency
  from?: string
  to?: string
}

export function SpendingOverTime({
  groupId,
  months,
  currency,
  from,
  to,
}: Props) {
  const t = useTranslations('Stats.OverTime')

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {!months || !currency ? (
          <StatBarListSkeleton />
        ) : months.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          <MonthlyBars
            groupId={groupId}
            months={months}
            currency={currency}
            from={from}
            to={to}
          />
        )}
      </CardContent>
    </Card>
  )
}

function MonthlyBars({
  groupId,
  months,
  currency,
  from,
  to,
}: {
  groupId: string
  months: MonthlySpending[]
  currency: Currency
  from?: string
  to?: string
}) {
  const locale = useLocale()
  const t = useTranslations('Stats.OverTime')
  const [selected, setSelected] = useState<string | null>(null)
  const max = Math.max(...months.map((month) => month.total))
  const monthFormat = new Intl.DateTimeFormat(locale, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
  const formatMonth = (month: string) =>
    monthFormat.format(new Date(`${month}-01T00:00:00Z`))

  const { data, isLoading } = trpc.groups.stats.monthExpenses.useQuery(
    {
      groupId,
      month: selected ?? '',
      from,
      to,
    },
    { enabled: selected !== null },
  )

  return (
    <>
      <div className="flex flex-col gap-4">
        {months.map((month) => (
          <button
            key={month.month}
            type="button"
            onClick={() => setSelected(month.month)}
            className="group -mx-2 flex w-full cursor-pointer flex-col gap-1.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t('showExpenses', { month: formatMonth(month.month) })}
          >
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="capitalize">{formatMonth(month.month)}</span>
              <div className="flex shrink-0 items-center gap-1">
                <span className="tabular-nums text-muted-foreground">
                  {formatCurrency(currency, month.total, locale)}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 transition-colors group-hover:text-muted-foreground" />
              </div>
            </div>
            <StatBar
              value={month.total}
              max={max}
              color="hsl(var(--chart-1))"
            />
          </button>
        ))}
      </div>

      <ExpensesDialog
        open={selected !== null}
        onClose={() => setSelected(null)}
        groupId={groupId}
        currency={currency}
        title={
          selected && (
            <span className="capitalize">{formatMonth(selected)}</span>
          )
        }
        description={t('detailsDescription')}
        emptyText={t('detailsEmpty')}
        expenses={data?.expenses}
        isLoading={isLoading}
      />
    </>
  )
}
