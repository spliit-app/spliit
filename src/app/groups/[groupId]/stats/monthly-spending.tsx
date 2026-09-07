'use client'

import { getColorByCategory } from '@/app/groups/[groupId]/stats/monthly-spending/category-palette'
import { MonthlySpendingChartType } from '@/app/groups/[groupId]/stats/monthly-spending/category-utils'
import {
  ChartTypeToggle,
  RoundAmountsToggle,
} from '@/app/groups/[groupId]/stats/monthly-spending/controls'
import { MonthlySpendingLegend } from '@/app/groups/[groupId]/stats/monthly-spending/legend'
import { MonthlyCategoryStackedChart } from '@/app/groups/[groupId]/stats/monthly-spending/stacked-chart'
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
import { Currency } from '@/lib/currency'
import {
  applyMonthlySpendingView,
  MonthlyCategorySpending,
  MonthlySpendingGrouping,
} from '@/lib/monthly-spending'
import { cn } from '@/lib/utils'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

export function MonthlySpending({
  monthlyCategorySpending,
  currency,
}: {
  monthlyCategorySpending?: MonthlyCategorySpending
  currency?: Currency
}) {
  const t = useTranslations('Stats.MonthlySpending')
  const tCategories = useTranslations('Categories')
  const locale = useLocale()
  const [grouping, setGrouping] =
    useState<MonthlySpendingGrouping>('categoryGroup')
  const [chartType, setChartType] = useState<MonthlySpendingChartType>('bars')
  const [roundAmounts, setRoundAmounts] = useState(true)

  const visibleSpending = useMemo(
    () =>
      monthlyCategorySpending
        ? applyMonthlySpendingView(monthlyCategorySpending, { grouping })
        : undefined,
    [grouping, monthlyCategorySpending],
  )
  const visibleCategories = useMemo(
    () =>
      visibleSpending?.categories.filter(
        (category) => category.expenseAmount > 0,
      ) ?? [],
    [visibleSpending],
  )
  const colorByCategory = useMemo(
    () => getColorByCategory(visibleCategories),
    [visibleCategories],
  )
  const firstYear = visibleSpending?.months[0]?.year
  const lastYear =
    visibleSpending?.months[visibleSpending.months.length - 1]?.year
  const includeYear = firstYear !== undefined && firstYear !== lastYear

  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="shrink-0">
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:min-w-0 sm:justify-end">
            <RoundAmountsToggle
              checked={roundAmounts}
              onCheckedChange={setRoundAmounts}
              t={t}
            />
            <Select
              value={grouping}
              onValueChange={(value) =>
                setGrouping(value as MonthlySpendingGrouping)
              }
            >
              <SelectTrigger
                aria-label={t('groupingLabel')}
                className="h-8 w-28"
              >
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
            <ChartTypeToggle
              chartType={chartType}
              onChartTypeChange={setChartType}
              t={t}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!visibleSpending || !currency ? (
          <MonthlySpendingLoading />
        ) : visibleSpending.months.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t('noData')}</p>
        ) : (
          <div
            className={cn(
              'gap-4',
              chartType === 'columns' &&
                'grid lg:grid-cols-[minmax(0,1fr)_13rem] lg:items-end',
            )}
          >
            <MonthlyCategoryStackedChart
              chartType={chartType}
              colorByCategory={colorByCategory}
              currency={currency}
              grouping={grouping}
              includeYear={includeYear}
              locale={locale}
              monthlyCategorySpending={visibleSpending}
              roundAmounts={roundAmounts}
              visibleCategories={visibleCategories}
              tCategories={tCategories}
            />
            <MonthlySpendingLegend
              categories={visibleCategories}
              className={cn(
                chartType === 'bars' && 'mt-3',
                chartType === 'columns' && 'mt-4 lg:mb-7 lg:mt-0',
              )}
              colorByCategory={colorByCategory}
              grouping={grouping}
              isVertical={chartType === 'columns'}
              tCategories={tCategories}
            />
          </div>
        )}
      </CardContent>
    </Card>
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
