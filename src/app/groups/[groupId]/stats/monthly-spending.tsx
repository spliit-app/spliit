'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  MonthlySpendingGrouping,
  MonthlySpendingRange,
} from '@/lib/monthly-spending'
import { formatCurrency, getCurrencyFromGroup } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { AppRouterOutput } from '@/trpc/routers/_app'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'
import { useCurrentGroup } from '../current-group-context'

type MonthlyCategorySpending =
  AppRouterOutput['groups']['stats']['get']['monthlyCategorySpending']
type MonthlySpendingCategory = MonthlyCategorySpending['categories'][number]
type MonthlySpendingMonth = MonthlyCategorySpending['months'][number]

const CATEGORY_COLORS = [
  'bg-sky-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-violet-500',
  'bg-cyan-500',
  'bg-lime-500',
  'bg-fuchsia-500',
  'bg-orange-500',
  'bg-teal-500',
]

export function MonthlySpending() {
  const { groupId, group } = useCurrentGroup()
  const t = useTranslations('Stats.MonthlySpending')
  const tCategories = useTranslations('Categories')
  const locale = useLocale()
  const [range, setRange] = useState<MonthlySpendingRange>('6')
  const [grouping, setGrouping] =
    useState<MonthlySpendingGrouping>('categoryGroup')

  const { data, isLoading } = trpc.groups.stats.get.useQuery({
    groupId,
    monthlySpendingGrouping: grouping,
    monthlySpendingRange: range,
  })

  const monthlyCategorySpending = data?.monthlyCategorySpending
  const currency = group ? getCurrencyFromGroup(group) : undefined
  const colorByCategory = useMemo(
    () => getColorByCategory(monthlyCategorySpending?.categories ?? []),
    [monthlyCategorySpending?.categories],
  )

  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:w-[22rem]">
            <Select
              value={range}
              onValueChange={(value) => setRange(value as MonthlySpendingRange)}
            >
              <SelectTrigger aria-label={t('rangeLabel')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">{t('RangeOptions.three')}</SelectItem>
                <SelectItem value="6">{t('RangeOptions.six')}</SelectItem>
                <SelectItem value="12">{t('RangeOptions.twelve')}</SelectItem>
                <SelectItem value="all">{t('RangeOptions.all')}</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={grouping}
              onValueChange={(value) =>
                setGrouping(value as MonthlySpendingGrouping)
              }
            >
              <SelectTrigger aria-label={t('groupingLabel')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="categoryGroup">
                  {t('GroupingOptions.categoryGroup')}
                </SelectItem>
                <SelectItem value="category">
                  {t('GroupingOptions.category')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading || !monthlyCategorySpending || !currency ? (
          <MonthlySpendingLoading />
        ) : monthlyCategorySpending.months.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t('noData')}</p>
        ) : (
          <div className="space-y-8">
            <MonthlyCategoryStackedBars
              colorByCategory={colorByCategory}
              currency={currency}
              grouping={grouping}
              locale={locale}
              monthlyCategorySpending={monthlyCategorySpending}
              tCategories={tCategories}
            />
            <MonthlySpendingLegend
              categories={monthlyCategorySpending.categories}
              colorByCategory={colorByCategory}
              grouping={grouping}
              tCategories={tCategories}
            />
            <div className="grid gap-8 lg:grid-cols-2">
              <MonthlyCategoryBreakdown
                colorByCategory={colorByCategory}
                currency={currency}
                grouping={grouping}
                locale={locale}
                monthlyCategorySpending={monthlyCategorySpending}
                t={t}
                tCategories={tCategories}
              />
              <MonthlySpendingTrend
                currency={currency}
                locale={locale}
                months={monthlyCategorySpending.months}
                t={t}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function MonthlyCategoryStackedBars({
  colorByCategory,
  currency,
  grouping,
  locale,
  monthlyCategorySpending,
  tCategories,
}: {
  colorByCategory: Map<string, string>
  currency: Parameters<typeof formatCurrency>[0]
  grouping: MonthlySpendingGrouping
  locale: string
  monthlyCategorySpending: MonthlyCategorySpending
  tCategories: (key: string) => string
}) {
  const t = useTranslations('Stats.MonthlySpending')

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">{t('stackedTitle')}</h3>
      <div className="space-y-2">
        {monthlyCategorySpending.months.map((month) => (
          <div
            key={month.key}
            className="grid gap-2 text-sm sm:grid-cols-[5rem_minmax(0,1fr)_7rem] sm:items-center"
          >
            <div className="text-muted-foreground">
              {formatMonth(month, locale, 'short')}
            </div>
            <div className="h-7 overflow-hidden rounded-md bg-muted">
              <div
                className="flex h-full"
                style={{
                  width:
                    monthlyCategorySpending.maxExpenseAmount > 0
                      ? `${
                          (month.expenseAmount /
                            monthlyCategorySpending.maxExpenseAmount) *
                          100
                        }%`
                      : '0%',
                }}
              >
                {month.categories
                  .filter((category) => category.expenseAmount > 0)
                  .map((category) => (
                    <div
                      key={category.key}
                      className={colorByCategory.get(category.key)}
                      style={{
                        width: `${
                          (category.expenseAmount / month.expenseAmount) * 100
                        }%`,
                      }}
                      title={`${getCategoryLabel(
                        category,
                        grouping,
                        tCategories,
                      )}: ${formatCurrency(
                        currency,
                        category.expenseAmount,
                        locale,
                      )}`}
                    />
                  ))}
              </div>
            </div>
            <div className="text-muted-foreground sm:text-right">
              {formatCurrency(currency, month.expenseAmount, locale)}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function MonthlyCategoryBreakdown({
  colorByCategory,
  currency,
  grouping,
  locale,
  monthlyCategorySpending,
  t,
  tCategories,
}: {
  colorByCategory: Map<string, string>
  currency: Parameters<typeof formatCurrency>[0]
  grouping: MonthlySpendingGrouping
  locale: string
  monthlyCategorySpending: MonthlyCategorySpending
  t: (key: string, values?: Record<string, string>) => string
  tCategories: (key: string) => string
}) {
  const month =
    monthlyCategorySpending.months.find(
      (month) => month.key === monthlyCategorySpending.highlightedMonthKey,
    ) ?? monthlyCategorySpending.months.at(-1)
  const categories =
    month?.categories.filter((category) => category.expenseAmount > 0) ?? []
  const maxCategoryAmount = Math.max(
    0,
    ...categories.map((category) => category.expenseAmount),
  )

  if (!month || (categories.length === 0 && month.incomeAmount >= 0)) {
    return null
  }

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">
        {t('breakdownTitle', { month: formatMonth(month, locale, 'long') })}
      </h3>
      {categories.length > 0 && (
        <div className="space-y-2">
          {categories.map((category) => (
            <div key={category.key} className="space-y-1 text-sm">
              <div className="flex justify-between gap-3">
                <span className="truncate">
                  {getCategoryLabel(category, grouping, tCategories)}
                </span>
                <span className="shrink-0 text-muted-foreground">
                  {formatCurrency(currency, category.expenseAmount, locale)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className={`h-2 rounded-full ${colorByCategory.get(
                    category.key,
                  )}`}
                  style={{
                    width: `${
                      (category.expenseAmount / maxCategoryAmount) * 100
                    }%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      {month.incomeAmount < 0 && (
        <p className="text-xs text-muted-foreground">
          {t('income')}: {formatCurrency(currency, month.incomeAmount, locale)}
        </p>
      )}
    </section>
  )
}

export function MonthlySpendingTrend({
  currency,
  locale,
  months,
  t,
}: {
  currency: Parameters<typeof formatCurrency>[0]
  locale: string
  months: MonthlySpendingMonth[]
  t: (key: string) => string
}) {
  const maxExpenseAmount = Math.max(
    0,
    ...months.map((month) => month.expenseAmount),
  )

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">{t('trendTitle')}</h3>
      <div className="overflow-x-auto">
        <div className="flex h-32 min-w-full items-end gap-2">
          {months.map((month) => {
            const height =
              maxExpenseAmount > 0
                ? (month.expenseAmount / maxExpenseAmount) * 100
                : 0
            return (
              <div
                key={month.key}
                className="flex min-w-10 flex-1 flex-col items-center justify-end gap-1"
                title={`${formatMonth(month, locale, 'long')}: ${formatCurrency(
                  currency,
                  month.expenseAmount,
                  locale,
                )}`}
              >
                <div
                  className="w-full max-w-8 rounded-t-md bg-muted-foreground/60"
                  style={{ height: `${height}%` }}
                />
                <div className="text-[10px] text-muted-foreground">
                  {formatMonth(month, locale, 'narrow')}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function MonthlySpendingLegend({
  categories,
  colorByCategory,
  grouping,
  tCategories,
}: {
  categories: MonthlySpendingCategory[]
  colorByCategory: Map<string, string>
  grouping: MonthlySpendingGrouping
  tCategories: (key: string) => string
}) {
  const visibleCategories = categories.filter(
    (category) => category.expenseAmount > 0,
  )

  if (visibleCategories.length === 0) return null

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
      {visibleCategories.map((category) => (
        <div key={category.key} className="flex min-w-0 items-center gap-2">
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${colorByCategory.get(
              category.key,
            )}`}
          />
          <span className="truncate">
            {getCategoryLabel(category, grouping, tCategories)}
          </span>
        </div>
      ))}
    </div>
  )
}

function MonthlySpendingLoading() {
  return (
    <div className="space-y-5">
      {[0, 1, 2].map((index) => (
        <div key={index} className="grid gap-2 sm:grid-cols-[5rem_1fr_7rem]">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  )
}

function getColorByCategory(categories: MonthlySpendingCategory[]) {
  return new Map(
    categories.map((category, index) => [
      category.key,
      CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    ]),
  )
}

function getCategoryLabel(
  category: Pick<MonthlySpendingCategory, 'grouping' | 'name'>,
  grouping: MonthlySpendingGrouping,
  tCategories: (key: string) => string,
) {
  if (grouping === 'categoryGroup') {
    return tCategories(`${category.grouping}.heading`)
  }

  return tCategories(`${category.grouping}.${category.name}`)
}

function formatMonth(
  month: Pick<MonthlySpendingMonth, 'year' | 'month'>,
  locale: string,
  length: 'short' | 'long' | 'narrow',
) {
  return new Intl.DateTimeFormat(locale, {
    month: length === 'narrow' ? 'short' : length,
    timeZone: 'UTC',
    year: length === 'long' ? 'numeric' : undefined,
  }).format(new Date(Date.UTC(month.year, month.month, 1)))
}
