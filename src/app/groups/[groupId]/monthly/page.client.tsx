'use client'

import { useCurrentGroup } from '@/app/groups/[groupId]/current-group-context'
import { CategoryIcon } from '@/app/groups/[groupId]/expenses/category-icon'
import { SeriesBadge } from '@/app/groups/[groupId]/expenses/expense-card'
import { ReimbursementList } from '@/app/groups/[groupId]/reimbursement-list'
import { StatBarListSkeleton } from '@/app/groups/[groupId]/stats/stat-bar'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { TrackPage } from '@/lib/analytics/track-page'
import { Currency } from '@/lib/currency'
import { useActiveUser } from '@/lib/hooks'
import {
  addMonths,
  MonthlyReport,
  MonthlyReportEntry,
  MonthlyReportEntryType,
  OpenInstallmentPlan,
  UpcomingMonth,
} from '@/lib/monthly-report'
import { cn, formatCurrency, getCurrencyFromGroup } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { keepPreviousData } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, CreditCard } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

/** Colors of the spending types, shared by the bars and their legend. */
const TYPE_COLORS: Record<
  Exclude<MonthlyReportEntryType, 'reimbursement'>,
  string
> = {
  installment: 'hsl(var(--chart-1))',
  recurring: 'hsl(var(--chart-2))',
  oneOff: 'hsl(var(--chart-3))',
}
const SPENDING_TYPES = ['installment', 'recurring', 'oneOff'] as const
const ENTRY_SECTIONS: MonthlyReportEntryType[] = [
  'installment',
  'recurring',
  'oneOff',
  'reimbursement',
]

function getLocalMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function useMonthFormat(
  options: Intl.DateTimeFormatOptions,
  { capitalize = true }: { capitalize?: boolean } = {},
) {
  const locale = useLocale()
  return useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, {
      ...options,
      timeZone: 'UTC',
    })
    // Only the first letter is upper-cased: a CSS text transform would turn
    // "novembro de 2026" into "Novembro De 2026".
    return (month: string) => {
      const label = format.format(new Date(`${month}-01T00:00:00Z`))
      if (!capitalize) return label
      return label.charAt(0).toLocaleUpperCase(locale) + label.slice(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale])
}

export function MonthlyPageClient() {
  const { groupId, group } = useCurrentGroup()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const utils = trpc.useUtils()

  // The user's month, not the server's: computed once, in the browser.
  const [currentMonth] = useState(() => getLocalMonthKey())
  const requestedMonth = searchParams.get('month')
  const month =
    requestedMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth)
      ? requestedMonth
      : currentMonth
  const setMonth = (next: string) =>
    router.replace(
      next === currentMonth ? pathname : `${pathname}?month=${next}`,
      { scroll: false },
    )

  useEffect(() => {
    // Expenses may have changed since the report was last loaded.
    utils.groups.stats.monthly.invalidate()
  }, [utils])

  const { data, isFetching } = trpc.groups.stats.monthly.useQuery(
    { groupId, month, currentMonth },
    { placeholderData: keepPreviousData },
  )
  const currency = group ? getCurrencyFromGroup(group) : undefined
  const report = data?.report.month === month ? data.report : undefined

  return (
    <>
      <TrackPage path={`/groups/${groupId}/monthly`} />
      <MonthSummary
        month={month}
        currentMonth={currentMonth}
        onMonthChange={setMonth}
        report={report}
        currency={currency}
        isFetching={isFetching}
      />
      {report && currency && group && (
        <>
          <MonthSettlement
            report={report}
            currency={currency}
            groupId={groupId}
            participants={group.participants}
          />
          {ENTRY_SECTIONS.map((type) => (
            <EntriesCard
              key={type}
              type={type}
              entries={report.entries.filter((entry) => entry.type === type)}
              currency={currency}
              groupId={groupId}
            />
          ))}
        </>
      )}
      <UpcomingMonths
        months={data?.upcoming}
        currency={currency}
        selectedMonth={month}
        onMonthChange={setMonth}
      />
      <InstallmentPlans
        plans={data?.installmentPlans}
        currency={currency}
        groupId={groupId}
      />
    </>
  )
}

function MonthSummary({
  month,
  currentMonth,
  onMonthChange,
  report,
  currency,
  isFetching,
}: {
  month: string
  currentMonth: string
  onMonthChange: (month: string) => void
  report?: MonthlyReport
  currency?: Currency
  isFetching: boolean
}) {
  const t = useTranslations('Monthly')
  const locale = useLocale()
  const formatMonth = useMonthFormat({ month: 'long', year: 'numeric' })
  const money = (amount: number) =>
    currency ? formatCurrency(currency, amount, locale) : ''

  return (
    <Card className="mb-4">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('previousMonth')}
            data-testid="previous-month"
            onClick={() => onMonthChange(addMonths(month, -1))}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="text-center">
            <CardTitle data-testid="report-month">
              {formatMonth(month)}
            </CardTitle>
            <CardDescription>
              {month === currentMonth ? (
                t('thisMonth')
              ) : (
                <Button
                  variant="link"
                  className="h-auto p-0"
                  onClick={() => onMonthChange(currentMonth)}
                >
                  {t('backToThisMonth')}
                </Button>
              )}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('nextMonth')}
            data-testid="next-month"
            onClick={() => onMonthChange(addMonths(month, 1))}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent
        className={cn(
          'space-y-4 transition-opacity',
          isFetching && 'opacity-60',
        )}
      >
        {!report || !currency ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-4 w-60" />
          </div>
        ) : (
          <>
            <div>
              <div className="text-muted-foreground text-sm">{t('total')}</div>
              <div
                className="text-2xl font-semibold tabular-nums"
                data-testid="month-total"
              >
                {money(report.totals.total)}
              </div>
              {report.totals.expected !== 0 && (
                <div className="text-sm text-muted-foreground">
                  {t('recordedAndExpected', {
                    recorded: money(report.totals.recorded),
                    expected: money(report.totals.expected),
                  })}
                </div>
              )}
            </div>
            <StackedBar
              parts={SPENDING_TYPES.map((type) => ({
                key: type,
                value: report.totals.byType[type].amount,
                color: TYPE_COLORS[type],
              }))}
            />
            <div className="grid grid-cols-3 gap-2">
              {SPENDING_TYPES.map((type) => (
                <div key={type} className="text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: TYPE_COLORS[type] }}
                    />
                    <span className="truncate">{t(`types.${type}`)}</span>
                  </div>
                  <div
                    className="tabular-nums font-medium"
                    data-testid={`total-${type}`}
                  >
                    {money(report.totals.byType[type].amount)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('entryCount', {
                      count: report.totals.byType[type].count,
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function StackedBar({
  parts,
  max,
}: {
  parts: { key: string; value: number; color: string }[]
  /** Defaults to the sum of the parts: a bar filling the whole width. */
  max?: number
}) {
  const total = parts.reduce((sum, part) => sum + Math.max(part.value, 0), 0)
  const scale = max ?? total
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
      {scale > 0 &&
        parts.map((part) =>
          part.value > 0 ? (
            <div
              key={part.key}
              className="h-full"
              style={{
                width: `${(part.value / scale) * 100}%`,
                backgroundColor: part.color,
              }}
            />
          ) : null,
        )}
    </div>
  )
}

function MonthSettlement({
  report,
  currency,
  groupId,
  participants,
}: {
  report: MonthlyReport
  currency: Currency
  groupId: string
  participants: { id: string; name: string; groupId: string }[]
}) {
  const t = useTranslations('Monthly.Settlement')
  const locale = useLocale()
  const activeUser = useActiveUser(groupId)
  const hasExpected = report.entries.some((entry) => entry.expected)
  const [includeExpected, setIncludeExpected] = useState(true)
  const settlement =
    hasExpected && includeExpected
      ? report.settlementWithExpected
      : report.settlement
  const rows = settlement.participants.filter(
    (row) => row.paid !== 0 || row.share !== 0 || row.balance !== 0,
  )

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasExpected && (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={includeExpected}
              onCheckedChange={(checked) => setIncludeExpected(!!checked)}
              data-testid="include-expected"
            />
            {t('includeExpected')}
          </label>
        )}
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table
              className="w-full text-xs sm:text-sm"
              data-testid="settlement-table"
            >
              <thead>
                <tr className="text-muted-foreground text-xs">
                  <th className="text-left font-normal pb-2">
                    {t('participant')}
                  </th>
                  <th className="text-right font-normal pb-2 pl-3">
                    {t('paid')}
                  </th>
                  <th className="text-right font-normal pb-2 pl-3">
                    {t('share')}
                  </th>
                  <th className="text-right font-normal pb-2 pl-3">
                    {t('balance')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      'border-t',
                      row.id === activeUser && 'font-semibold',
                    )}
                  >
                    <td className="py-2">{row.name}</td>
                    <td className="py-2 pl-3 text-right tabular-nums whitespace-nowrap">
                      {formatCurrency(currency, row.paid, locale)}
                    </td>
                    <td className="py-2 pl-3 text-right tabular-nums whitespace-nowrap">
                      {formatCurrency(currency, row.share, locale)}
                    </td>
                    <td
                      className={cn(
                        'py-2 pl-3 text-right tabular-nums whitespace-nowrap',
                        row.balance > 0 && 'text-green-600 dark:text-green-500',
                        row.balance < 0 && 'text-red-600 dark:text-red-500',
                      )}
                    >
                      {formatCurrency(currency, row.balance, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div>
          <div className="text-sm font-medium">{t('howToSettle')}</div>
          <ReimbursementList
            reimbursements={settlement.reimbursements}
            participants={participants}
            currency={currency}
            groupId={groupId}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function EntriesCard({
  type,
  entries,
  currency,
  groupId,
}: {
  type: MonthlyReportEntryType
  entries: MonthlyReportEntry[]
  currency: Currency
  groupId: string
}) {
  const t = useTranslations('Monthly')
  const locale = useLocale()
  if (entries.length === 0) return null
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0)

  return (
    <Card className="mb-4" data-testid={`entries-${type}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-baseline justify-between gap-2">
          <span>{t(`sections.${type}`)}</span>
          <span className="text-base tabular-nums">
            {formatCurrency(currency, total, locale)}
          </span>
        </CardTitle>
        <CardDescription>{t(`sectionDescriptions.${type}`)}</CardDescription>
      </CardHeader>
      <CardContent className="px-0 sm:px-0 pb-2">
        {entries.map((entry) => (
          <EntryRow
            key={entry.id}
            entry={entry}
            currency={currency}
            groupId={groupId}
          />
        ))}
      </CardContent>
    </Card>
  )
}

function EntryRow({
  entry,
  currency,
  groupId,
}: {
  entry: MonthlyReportEntry
  currency: Currency
  groupId: string
}) {
  const t = useTranslations('Monthly')
  const locale = useLocale()
  const date = new Date(entry.date).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })

  return (
    <Link
      href={`/groups/${groupId}/expenses/${entry.expenseId}/edit`}
      data-testid="report-entry"
      data-expected={entry.expected}
      className={cn(
        'flex items-start gap-2 px-4 sm:px-6 py-3 text-sm hover:bg-accent border-t first:border-t-0',
        entry.expected && 'text-muted-foreground',
      )}
    >
      <CategoryIcon
        category={entry.category}
        className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground"
      />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={cn(entry.type === 'reimbursement' && 'italic')}>
            {entry.title}
          </span>
          {entry.occurrenceNumber != null && (
            <SeriesBadge
              expense={{
                occurrenceNumber: entry.occurrenceNumber,
                recurrenceRule: 'MONTHLY',
                series: {
                  kind:
                    entry.type === 'installment' ? 'INSTALLMENTS' : 'RECURRING',
                  occurrenceCount: entry.occurrenceCount,
                },
              }}
            />
          )}
          {entry.expected && (
            <span className="rounded-full border border-dashed px-1.5 text-[11px]">
              {t('expected')}
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {t('entryDetails', { date, paidBy: entry.paidBy.name })}
          {entry.remaining && entry.remaining.count > 0 && (
            <>
              {' · '}
              {t('remaining', {
                count: entry.remaining.count,
                amount: formatCurrency(
                  currency,
                  entry.remaining.amount,
                  locale,
                ),
              })}
            </>
          )}
          {entry.remaining && entry.remaining.count === 0 && (
            <>
              {' · '}
              {t('lastInstallment')}
            </>
          )}
        </div>
      </div>
      <div
        className={cn(
          'tabular-nums whitespace-nowrap',
          !entry.expected && entry.type !== 'reimbursement' && 'font-bold',
        )}
      >
        {formatCurrency(currency, entry.amount, locale)}
      </div>
    </Link>
  )
}

function UpcomingMonths({
  months,
  currency,
  selectedMonth,
  onMonthChange,
}: {
  months?: UpcomingMonth[]
  currency?: Currency
  selectedMonth: string
  onMonthChange: (month: string) => void
}) {
  const t = useTranslations('Monthly.Upcoming')
  const tTypes = useTranslations('Monthly.types')
  const locale = useLocale()
  const formatMonth = useMonthFormat({ month: 'short', year: 'numeric' })
  const max = Math.max(0, ...(months ?? []).map((month) => month.total))

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {!months || !currency ? (
          <StatBarListSkeleton />
        ) : (
          <>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4 text-xs text-muted-foreground">
              {SPENDING_TYPES.map((type) => (
                <span key={type} className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: TYPE_COLORS[type] }}
                  />
                  {tTypes(type)}
                </span>
              ))}
            </div>
            <div className="flex flex-col gap-1" data-testid="upcoming-months">
              {months.map((month) => (
                <button
                  key={month.month}
                  type="button"
                  onClick={() => onMonthChange(month.month)}
                  className={cn(
                    '-mx-2 flex flex-col gap-1.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none',
                    month.month === selectedMonth && 'bg-accent',
                  )}
                >
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span>{formatMonth(month.month)}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatCurrency(currency, month.total, locale)}
                    </span>
                  </div>
                  <StackedBar
                    max={max}
                    parts={SPENDING_TYPES.map((type) => ({
                      key: type,
                      value: month[type],
                      color: TYPE_COLORS[type],
                    }))}
                  />
                </button>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function InstallmentPlans({
  plans,
  currency,
  groupId,
}: {
  plans?: OpenInstallmentPlan[]
  currency?: Currency
  groupId: string
}) {
  const t = useTranslations('Monthly.Plans')
  const locale = useLocale()
  const formatMonth = useMonthFormat(
    { month: 'short', year: 'numeric' },
    { capitalize: false },
  )
  if (!plans || !currency) return null

  const remaining = plans.reduce((sum, plan) => sum + plan.remainingAmount, 0)
  const remainingCount = plans.reduce(
    (sum, plan) => sum + plan.remainingCount,
    0,
  )

  return (
    <Card className="mb-4" data-testid="installment-plans">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>
          {plans.length === 0
            ? t('empty')
            : t('summary', {
                amount: formatCurrency(currency, remaining, locale),
                count: remainingCount,
              })}
        </CardDescription>
      </CardHeader>
      {plans.length > 0 && (
        <CardContent className="px-0 sm:px-0 pb-2">
          {plans.map((plan) => {
            const count =
              plan.occurrenceCount ?? plan.recordedCount + plan.remainingCount
            return (
              <Link
                key={plan.seriesId}
                href={`/groups/${groupId}/expenses/${plan.expenseId}/edit`}
                className="flex items-start gap-3 px-4 sm:px-6 py-3 text-sm hover:bg-accent border-t first:border-t-0"
              >
                <CreditCard className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate">{plan.title}</span>
                    <span className="tabular-nums whitespace-nowrap">
                      {formatCurrency(currency, plan.remainingAmount, locale)}
                    </span>
                  </div>
                  <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(plan.recordedCount / count) * 100}%`,
                        backgroundColor: TYPE_COLORS.installment,
                      }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('progress', {
                      recorded: plan.recordedCount,
                      count,
                      remaining: plan.remainingCount,
                      last: formatMonth(
                        new Date(plan.lastDate).toISOString().slice(0, 7),
                      ),
                    })}
                  </div>
                </div>
              </Link>
            )
          })}
        </CardContent>
      )}
    </Card>
  )
}
