'use client'

import { CategoryIcon } from '@/app/groups/[groupId]/expenses/category-icon'
import { BalanceTimelineChart } from '@/app/groups/[groupId]/stats/balance-timeline-chart'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatChartCurrency } from '@/lib/chart-currency'
import {
  MonthlySpendingGrouping,
  MonthlySpendingRange,
} from '@/lib/monthly-spending'
import { cn, formatCurrency, getCurrencyFromGroup } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { AppRouterOutput } from '@/trpc/routers/_app'
import {
  Banknote,
  Bus,
  ChartBarStacked,
  ChartColumnStacked,
  FerrisWheel,
  HandHelping,
  Home,
  PlugZap,
  Utensils,
} from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'
import { useCurrentGroup } from '../current-group-context'

type MonthlyCategorySpending =
  AppRouterOutput['groups']['stats']['get']['monthlyCategorySpending']
type MonthlySpendingCategory = MonthlyCategorySpending['categories'][number]
type MonthlySpendingMonth = MonthlyCategorySpending['months'][number]
type MonthlySpendingChartType = 'bars' | 'columns'

type CategoryColor = {
  backgroundClassName: string
  borderClassName: string
  foregroundClassName: string
}

const CATEGORY_COLORS_BY_GROUP: Record<string, CategoryColor[]> = {
  Uncategorized: [
    getCategoryColor(
      'bg-slate-200 dark:bg-slate-800',
      'border-slate-300 dark:border-slate-700',
      'text-slate-950 dark:text-slate-50',
    ),
    getCategoryColor(
      'bg-zinc-200 dark:bg-zinc-800',
      'border-zinc-300 dark:border-zinc-700',
      'text-zinc-950 dark:text-zinc-50',
    ),
  ],
  Entertainment: [
    getCategoryColor(
      'bg-rose-200 dark:bg-rose-900',
      'border-rose-300 dark:border-rose-800',
      'text-rose-950 dark:text-rose-50',
    ),
    getCategoryColor(
      'bg-pink-200 dark:bg-pink-900',
      'border-pink-300 dark:border-pink-800',
      'text-pink-950 dark:text-pink-50',
    ),
    getCategoryColor(
      'bg-fuchsia-200 dark:bg-fuchsia-900',
      'border-fuchsia-300 dark:border-fuchsia-800',
      'text-fuchsia-950 dark:text-fuchsia-50',
    ),
  ],
  'Food and Drink': [
    getCategoryColor(
      'bg-emerald-200 dark:bg-emerald-900',
      'border-emerald-300 dark:border-emerald-800',
      'text-emerald-950 dark:text-emerald-50',
    ),
    getCategoryColor(
      'bg-green-200 dark:bg-green-900',
      'border-green-300 dark:border-green-800',
      'text-green-950 dark:text-green-50',
    ),
    getCategoryColor(
      'bg-lime-200 dark:bg-lime-900',
      'border-lime-300 dark:border-lime-800',
      'text-lime-950 dark:text-lime-50',
    ),
    getCategoryColor(
      'bg-teal-200 dark:bg-teal-900',
      'border-teal-300 dark:border-teal-800',
      'text-teal-950 dark:text-teal-50',
    ),
  ],
  Home: [
    getCategoryColor(
      'bg-sky-200 dark:bg-sky-900',
      'border-sky-300 dark:border-sky-800',
      'text-sky-950 dark:text-sky-50',
    ),
    getCategoryColor(
      'bg-blue-200 dark:bg-blue-900',
      'border-blue-300 dark:border-blue-800',
      'text-blue-950 dark:text-blue-50',
    ),
    getCategoryColor(
      'bg-cyan-200 dark:bg-cyan-900',
      'border-cyan-300 dark:border-cyan-800',
      'text-cyan-950 dark:text-cyan-50',
    ),
  ],
  Life: [
    getCategoryColor(
      'bg-violet-200 dark:bg-violet-900',
      'border-violet-300 dark:border-violet-800',
      'text-violet-950 dark:text-violet-50',
    ),
    getCategoryColor(
      'bg-purple-200 dark:bg-purple-900',
      'border-purple-300 dark:border-purple-800',
      'text-purple-950 dark:text-purple-50',
    ),
    getCategoryColor(
      'bg-fuchsia-200 dark:bg-fuchsia-900',
      'border-fuchsia-300 dark:border-fuchsia-800',
      'text-fuchsia-950 dark:text-fuchsia-50',
    ),
  ],
  Transportation: [
    getCategoryColor(
      'bg-indigo-200 dark:bg-indigo-900',
      'border-indigo-300 dark:border-indigo-800',
      'text-indigo-950 dark:text-indigo-50',
    ),
    getCategoryColor(
      'bg-cyan-200 dark:bg-cyan-900',
      'border-cyan-300 dark:border-cyan-800',
      'text-cyan-950 dark:text-cyan-50',
    ),
    getCategoryColor(
      'bg-blue-200 dark:bg-blue-900',
      'border-blue-300 dark:border-blue-800',
      'text-blue-950 dark:text-blue-50',
    ),
  ],
  Utilities: [
    getCategoryColor(
      'bg-amber-200 dark:bg-amber-900',
      'border-amber-300 dark:border-amber-800',
      'text-amber-950 dark:text-amber-50',
    ),
    getCategoryColor(
      'bg-yellow-200 dark:bg-yellow-900',
      'border-yellow-300 dark:border-yellow-800',
      'text-yellow-950 dark:text-yellow-50',
    ),
    getCategoryColor(
      'bg-orange-200 dark:bg-orange-900',
      'border-orange-300 dark:border-orange-800',
      'text-orange-950 dark:text-orange-50',
    ),
  ],
}

const FALLBACK_CATEGORY_COLORS = [
  getCategoryColor(
    'bg-slate-200 dark:bg-slate-800',
    'border-slate-300 dark:border-slate-700',
    'text-slate-950 dark:text-slate-50',
  ),
  getCategoryColor(
    'bg-stone-200 dark:bg-stone-800',
    'border-stone-300 dark:border-stone-700',
    'text-stone-950 dark:text-stone-50',
  ),
  getCategoryColor(
    'bg-neutral-200 dark:bg-neutral-800',
    'border-neutral-300 dark:border-neutral-700',
    'text-neutral-950 dark:text-neutral-50',
  ),
]

const DETAILED_CATEGORY_COLORS_BY_KEY: Record<string, CategoryColor> = {
  'Utilities:Cleaning': getCategoryColor(
    'bg-teal-200 dark:bg-teal-900',
    'border-teal-300 dark:border-teal-800',
    'text-teal-950 dark:text-teal-50',
  ),
  'Utilities:Electricity': getCategoryColor(
    'bg-yellow-200 dark:bg-yellow-900',
    'border-yellow-300 dark:border-yellow-800',
    'text-yellow-950 dark:text-yellow-50',
  ),
  'Utilities:Heat/Gas': getCategoryColor(
    'bg-orange-200 dark:bg-orange-900',
    'border-orange-300 dark:border-orange-800',
    'text-orange-950 dark:text-orange-50',
  ),
  'Utilities:Trash': getCategoryColor(
    'bg-slate-200 dark:bg-slate-800',
    'border-slate-300 dark:border-slate-700',
    'text-slate-950 dark:text-slate-50',
  ),
  'Utilities:TV/Phone/Internet': getCategoryColor(
    'bg-sky-200 dark:bg-sky-900',
    'border-sky-300 dark:border-sky-800',
    'text-sky-950 dark:text-sky-50',
  ),
  'Utilities:Water': getCategoryColor(
    'bg-blue-200 dark:bg-blue-900',
    'border-blue-300 dark:border-blue-800',
    'text-blue-950 dark:text-blue-50',
  ),
}

const DETAILED_CATEGORY_COLOR_SPECTRUM = [
  getCategoryColor(
    'bg-emerald-200 dark:bg-emerald-900',
    'border-emerald-300 dark:border-emerald-800',
    'text-emerald-950 dark:text-emerald-50',
  ),
  getCategoryColor(
    'bg-sky-200 dark:bg-sky-900',
    'border-sky-300 dark:border-sky-800',
    'text-sky-950 dark:text-sky-50',
  ),
  getCategoryColor(
    'bg-amber-200 dark:bg-amber-900',
    'border-amber-300 dark:border-amber-800',
    'text-amber-950 dark:text-amber-50',
  ),
  getCategoryColor(
    'bg-violet-200 dark:bg-violet-900',
    'border-violet-300 dark:border-violet-800',
    'text-violet-950 dark:text-violet-50',
  ),
  getCategoryColor(
    'bg-rose-200 dark:bg-rose-900',
    'border-rose-300 dark:border-rose-800',
    'text-rose-950 dark:text-rose-50',
  ),
  getCategoryColor(
    'bg-teal-200 dark:bg-teal-900',
    'border-teal-300 dark:border-teal-800',
    'text-teal-950 dark:text-teal-50',
  ),
  getCategoryColor(
    'bg-indigo-200 dark:bg-indigo-900',
    'border-indigo-300 dark:border-indigo-800',
    'text-indigo-950 dark:text-indigo-50',
  ),
  getCategoryColor(
    'bg-lime-200 dark:bg-lime-900',
    'border-lime-300 dark:border-lime-800',
    'text-lime-950 dark:text-lime-50',
  ),
  getCategoryColor(
    'bg-orange-200 dark:bg-orange-900',
    'border-orange-300 dark:border-orange-800',
    'text-orange-950 dark:text-orange-50',
  ),
  getCategoryColor(
    'bg-cyan-200 dark:bg-cyan-900',
    'border-cyan-300 dark:border-cyan-800',
    'text-cyan-950 dark:text-cyan-50',
  ),
  getCategoryColor(
    'bg-fuchsia-200 dark:bg-fuchsia-900',
    'border-fuchsia-300 dark:border-fuchsia-800',
    'text-fuchsia-950 dark:text-fuchsia-50',
  ),
  getCategoryColor(
    'bg-blue-200 dark:bg-blue-900',
    'border-blue-300 dark:border-blue-800',
    'text-blue-950 dark:text-blue-50',
  ),
]

export function MonthlySpending() {
  const { groupId, group } = useCurrentGroup()
  const t = useTranslations('Stats.MonthlySpending')
  const tCategories = useTranslations('Categories')
  const locale = useLocale()
  const [range, setRange] = useState<MonthlySpendingRange>('6')
  const [grouping, setGrouping] =
    useState<MonthlySpendingGrouping>('categoryGroup')
  const [chartType, setChartType] = useState<MonthlySpendingChartType>('bars')
  const [roundAmounts, setRoundAmounts] = useState(true)

  const { data, isLoading } = trpc.groups.stats.get.useQuery({
    groupId,
    monthlySpendingGrouping: grouping,
    monthlySpendingRange: range,
  })

  const monthlyCategorySpending = data?.monthlyCategorySpending
  const balanceTimeline = data?.balanceTimeline
  const currency = group ? getCurrencyFromGroup(group) : undefined
  const visibleCategories =
    monthlyCategorySpending?.categories.filter(
      (category) => category.expenseAmount > 0,
    ) ?? []
  const colorByCategory = useMemo(
    () => getColorByCategory(monthlyCategorySpending?.categories ?? []),
    [monthlyCategorySpending?.categories],
  )

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
              value={range}
              onValueChange={(value) => setRange(value as MonthlySpendingRange)}
            >
              <SelectTrigger aria-label={t('rangeLabel')} className="h-8 w-28">
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
        {isLoading ||
        !monthlyCategorySpending ||
        !balanceTimeline ||
        !currency ? (
          <MonthlySpendingLoading />
        ) : monthlyCategorySpending.months.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t('noData')}</p>
        ) : (
          <div className="space-y-8">
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
                locale={locale}
                monthlyCategorySpending={monthlyCategorySpending}
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
            <MonthlyCategoryBreakdown
              colorByCategory={colorByCategory}
              currency={currency}
              grouping={grouping}
              locale={locale}
              monthlyCategorySpending={monthlyCategorySpending}
              range={range}
              roundAmounts={roundAmounts}
              t={t}
              tCategories={tCategories}
            />
            <BalanceTimelineChart
              balanceTimeline={balanceTimeline}
              currency={currency}
              locale={locale}
              roundAmounts={roundAmounts}
              t={t}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ChartTypeToggle({
  chartType,
  onChartTypeChange,
  t,
}: {
  chartType: MonthlySpendingChartType
  onChartTypeChange: (chartType: MonthlySpendingChartType) => void
  t: (key: string) => string
}) {
  return (
    <div
      aria-label={t('chartTypeLabel')}
      className="inline-flex h-8 shrink-0 rounded-md border border-input bg-background"
      role="group"
    >
      <Button
        aria-label={t('ChartTypes.bars')}
        aria-pressed={chartType === 'bars'}
        className={cn(
          'h-7 w-8 rounded-r-none border-0 px-2',
          chartType === 'bars' && 'bg-accent text-accent-foreground',
        )}
        onClick={() => onChartTypeChange('bars')}
        title={t('ChartTypes.bars')}
        type="button"
        variant="ghost"
      >
        <ChartBarStacked className="h-4 w-4" />
      </Button>
      <Button
        aria-label={t('ChartTypes.columns')}
        aria-pressed={chartType === 'columns'}
        className={cn(
          'h-7 w-8 rounded-l-none border-0 px-2',
          chartType === 'columns' && 'bg-accent text-accent-foreground',
        )}
        onClick={() => onChartTypeChange('columns')}
        title={t('ChartTypes.columns')}
        type="button"
        variant="ghost"
      >
        <ChartColumnStacked className="h-4 w-4" />
      </Button>
    </div>
  )
}

function RoundAmountsToggle({
  checked,
  onCheckedChange,
  t,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  t: (key: string) => string
}) {
  return (
    <label className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-input px-2 text-xs text-muted-foreground">
      <Checkbox
        className="h-3.5 w-3.5"
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <span>{t('roundAmountsLabel')}</span>
    </label>
  )
}

export function MonthlyCategoryStackedChart({
  chartType,
  colorByCategory,
  currency,
  grouping,
  locale,
  monthlyCategorySpending,
  roundAmounts,
  tCategories,
  visibleCategories,
}: {
  chartType: MonthlySpendingChartType
  colorByCategory: Map<string, CategoryColor>
  currency: Parameters<typeof formatCurrency>[0]
  grouping: MonthlySpendingGrouping
  locale: string
  monthlyCategorySpending: MonthlyCategorySpending
  roundAmounts: boolean
  tCategories: (key: string) => string
  visibleCategories: MonthlySpendingCategory[]
}) {
  const t = useTranslations('Stats.MonthlySpending')

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">{t('stackedTitle')}</h3>
      {chartType === 'columns' ? (
        <MonthlyCategoryStackedColumns
          colorByCategory={colorByCategory}
          currency={currency}
          grouping={grouping}
          locale={locale}
          monthlyCategorySpending={monthlyCategorySpending}
          roundAmounts={roundAmounts}
          tCategories={tCategories}
          visibleCategories={visibleCategories}
        />
      ) : (
        <MonthlyCategoryStackedBars
          colorByCategory={colorByCategory}
          currency={currency}
          grouping={grouping}
          locale={locale}
          monthlyCategorySpending={monthlyCategorySpending}
          roundAmounts={roundAmounts}
          tCategories={tCategories}
          visibleCategories={visibleCategories}
        />
      )}
    </section>
  )
}

function MonthlyCategoryStackedBars({
  colorByCategory,
  currency,
  grouping,
  locale,
  monthlyCategorySpending,
  roundAmounts,
  tCategories,
  visibleCategories,
}: {
  colorByCategory: Map<string, CategoryColor>
  currency: Parameters<typeof formatCurrency>[0]
  grouping: MonthlySpendingGrouping
  locale: string
  monthlyCategorySpending: MonthlyCategorySpending
  roundAmounts: boolean
  tCategories: (key: string) => string
  visibleCategories: MonthlySpendingCategory[]
}) {
  return (
    <div className="space-y-2">
      {monthlyCategorySpending.months.map((month) => {
        const monthCategories = getMonthCategoriesInDisplayOrder(
          month,
          visibleCategories,
        )
        const barShare = getShare(
          month.expenseAmount,
          monthlyCategorySpending.maxExpenseAmount,
        )
        const barUnits = month.expenseAmount > 0 ? Math.max(barShare, 0.03) : 0
        const remainderUnits = Math.max(0, 1 - barUnits)

        return (
          <div
            key={month.key}
            className="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-2 text-sm sm:grid-cols-[5rem_minmax(0,1fr)]"
          >
            <div className="text-muted-foreground">
              {formatMonth(month, locale, 'short')}
            </div>
            <div
              className="grid items-center gap-2"
              style={{
                gridTemplateColumns: `${barUnits}fr max-content ${remainderUnits}fr`,
              }}
            >
              <div className="h-7 min-w-0 overflow-hidden rounded-md bg-muted">
                <div className="flex h-full">
                  {monthCategories.map((category) => {
                    const share = getShare(
                      category.expenseAmount,
                      month.expenseAmount,
                    )
                    const categoryLabel = getCategoryLabel(
                      category,
                      grouping,
                      tCategories,
                    )
                    const color = colorByCategory.get(category.key)

                    return (
                      <div
                        aria-label={getCategoryHoverLabel({
                          amount: category.expenseAmount,
                          categoryLabel,
                          currency,
                          locale,
                          month,
                          roundAmounts,
                          share,
                        })}
                        className={cn(
                          'flex h-full min-w-[2px] items-center justify-start gap-1 overflow-hidden border-y px-1.5 text-[11px] font-medium',
                          color?.backgroundClassName,
                          color?.borderClassName,
                          color?.foregroundClassName,
                        )}
                        key={category.key}
                        style={{ width: `${share * 100}%` }}
                        title={getCategoryHoverLabel({
                          amount: category.expenseAmount,
                          categoryLabel,
                          currency,
                          locale,
                          month,
                          roundAmounts,
                          share,
                        })}
                      >
                        {share >= 0.06 && (
                          <GraphCategoryIcon
                            category={category}
                            className="h-3.5 w-3.5 shrink-0 opacity-50"
                            grouping={grouping}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="text-left text-xs text-muted-foreground">
                {formatChartCurrency({
                  amount: month.expenseAmount,
                  currency,
                  locale,
                  roundAmounts,
                })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MonthlyCategoryStackedColumns({
  colorByCategory,
  currency,
  grouping,
  locale,
  monthlyCategorySpending,
  roundAmounts,
  tCategories,
  visibleCategories,
}: {
  colorByCategory: Map<string, CategoryColor>
  currency: Parameters<typeof formatCurrency>[0]
  grouping: MonthlySpendingGrouping
  locale: string
  monthlyCategorySpending: MonthlyCategorySpending
  roundAmounts: boolean
  tCategories: (key: string) => string
  visibleCategories: MonthlySpendingCategory[]
}) {
  const gridTemplateColumns = `repeat(${monthlyCategorySpending.months.length}, minmax(0, 1fr))`

  return (
    <div className="pb-1">
      <div
        className="grid h-56 items-end gap-1 sm:gap-2"
        style={{ gridTemplateColumns }}
      >
        {monthlyCategorySpending.months.map((month) => {
          const columnHeight = getShare(
            month.expenseAmount,
            monthlyCategorySpending.maxExpenseAmount,
          )
          const columnHeightPercent =
            columnHeight > 0 ? Math.max(columnHeight * 100, 3) : 0
          const monthCategories = getMonthCategoriesInDisplayOrder(
            month,
            visibleCategories,
          )

          return (
            <div
              className="flex min-w-0 flex-col items-center gap-2"
              key={month.key}
            >
              <div className="relative h-48 w-full">
                <div
                  className="absolute max-w-full truncate text-left text-[10px] leading-none text-muted-foreground"
                  style={{
                    bottom:
                      columnHeightPercent > 0
                        ? `calc(${columnHeightPercent}% + 0.25rem)`
                        : '0.25rem',
                    left: '50%',
                    width: '3.75rem',
                    transform: 'translateX(-50%)',
                  }}
                >
                  {formatChartCurrency({
                    amount: month.expenseAmount,
                    currency,
                    locale,
                    roundAmounts,
                  })}
                </div>
                <div
                  className="absolute bottom-0 left-1/2 flex w-full max-w-14 -translate-x-1/2 items-end rounded-md bg-muted"
                  style={{
                    height:
                      columnHeightPercent > 0
                        ? `${columnHeightPercent}%`
                        : '0%',
                  }}
                  title={`${formatMonth(
                    month,
                    locale,
                    'long',
                  )}: ${formatChartCurrency({
                    amount: month.expenseAmount,
                    currency,
                    locale,
                    roundAmounts,
                  })}`}
                >
                  <div className="flex h-full w-full flex-col-reverse overflow-hidden rounded-md">
                    {monthCategories.map((category) => {
                      const share = getShare(
                        category.expenseAmount,
                        month.expenseAmount,
                      )
                      const categoryLabel = getCategoryLabel(
                        category,
                        grouping,
                        tCategories,
                      )
                      const color = colorByCategory.get(category.key)

                      return (
                        <div
                          aria-label={getCategoryHoverLabel({
                            amount: category.expenseAmount,
                            categoryLabel,
                            currency,
                            locale,
                            month,
                            roundAmounts,
                            share,
                          })}
                          className={cn(
                            'flex min-h-[3px] items-center justify-center overflow-hidden border-x px-0.5',
                            color?.backgroundClassName,
                            color?.borderClassName,
                            color?.foregroundClassName,
                          )}
                          key={category.key}
                          style={{ height: `${share * 100}%` }}
                          title={getCategoryHoverLabel({
                            amount: category.expenseAmount,
                            categoryLabel,
                            currency,
                            locale,
                            month,
                            roundAmounts,
                            share,
                          })}
                        >
                          {share >= 0.08 && (
                            <GraphCategoryIcon
                              category={category}
                              className="h-3.5 w-3.5 shrink-0 opacity-50"
                              grouping={grouping}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div className="w-full min-w-0 truncate text-center text-[10px] text-muted-foreground">
                {formatMonth(month, locale, 'narrow')}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function MonthlyCategoryBreakdown({
  colorByCategory,
  currency,
  grouping,
  locale,
  monthlyCategorySpending,
  range,
  roundAmounts,
  t,
  tCategories,
}: {
  colorByCategory: Map<string, CategoryColor>
  currency: Parameters<typeof formatCurrency>[0]
  grouping: MonthlySpendingGrouping
  locale: string
  monthlyCategorySpending: MonthlyCategorySpending
  range: MonthlySpendingRange
  roundAmounts: boolean
  t: (key: string, values?: Record<string, string>) => string
  tCategories: (key: string) => string
}) {
  const categories = monthlyCategorySpending.categories.filter(
    (category) => category.expenseAmount > 0,
  )
  const maxCategoryAmount = Math.max(
    0,
    ...categories.map((category) => category.expenseAmount),
  )
  const totalExpenseAmount = monthlyCategorySpending.months.reduce(
    (total, month) => total + month.expenseAmount,
    0,
  )
  const incomeAmount = monthlyCategorySpending.months.reduce(
    (total, month) => total + month.incomeAmount,
    0,
  )

  if (categories.length === 0 && incomeAmount >= 0) {
    return null
  }

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">
        {t('breakdownTitle', { range: getRangeLabel(range, t) })}
      </h3>
      {categories.length > 0 && (
        <div className="space-y-2">
          {categories.map((category) => {
            const share = getShare(category.expenseAmount, totalExpenseAmount)
            const categoryLabel = getCategoryLabel(
              category,
              grouping,
              tCategories,
            )
            const color = colorByCategory.get(category.key)

            return (
              <div
                key={category.key}
                className="space-y-1 text-sm"
                title={`${categoryLabel}: ${formatChartCurrency({
                  amount: category.expenseAmount,
                  currency,
                  locale,
                  roundAmounts,
                })} (${formatPercent(share, locale)})`}
              >
                <div>
                  <span className="truncate">{categoryLabel}</span>
                </div>
                <div className="relative h-7 overflow-hidden rounded-md bg-muted">
                  <div
                    className={cn('h-7 rounded-md', color?.backgroundClassName)}
                    style={{
                      width: `${
                        getShare(category.expenseAmount, maxCategoryAmount) *
                        100
                      }%`,
                    }}
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center px-2 text-xs font-medium text-foreground">
                    {formatChartCurrency({
                      amount: category.expenseAmount,
                      currency,
                      locale,
                      roundAmounts,
                    })}{' '}
                    ({formatPercent(share, locale)})
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {incomeAmount < 0 && (
        <p className="text-xs text-muted-foreground">
          {t('income')}:{' '}
          {formatChartCurrency({
            amount: incomeAmount,
            currency,
            locale,
            roundAmounts,
          })}
        </p>
      )}
    </section>
  )
}

function MonthlySpendingLegend({
  categories,
  className,
  colorByCategory,
  grouping,
  isVertical = false,
  tCategories,
}: {
  categories: MonthlySpendingCategory[]
  className?: string
  colorByCategory: Map<string, CategoryColor>
  grouping: MonthlySpendingGrouping
  isVertical?: boolean
  tCategories: (key: string) => string
}) {
  const visibleCategories = categories.filter(
    (category) => category.expenseAmount > 0,
  )

  if (visibleCategories.length === 0) return null

  return (
    <div
      className={cn(
        'text-xs text-muted-foreground',
        isVertical ? 'space-y-2' : 'flex flex-wrap gap-x-4 gap-y-2',
        className,
      )}
    >
      {visibleCategories.map((category) => (
        <div key={category.key} className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border',
              colorByCategory.get(category.key)?.backgroundClassName,
              colorByCategory.get(category.key)?.borderClassName,
              colorByCategory.get(category.key)?.foregroundClassName,
            )}
          >
            <GraphCategoryIcon
              category={category}
              className="h-3.5 w-3.5"
              grouping={grouping}
            />
          </span>
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

function GraphCategoryIcon({
  category,
  className,
  grouping,
}: {
  category: Pick<MonthlySpendingCategory, 'categoryId' | 'grouping' | 'name'>
  className?: string
  grouping: MonthlySpendingGrouping
}) {
  if (grouping === 'categoryGroup') {
    return (
      <CategoryGroupIcon className={className} grouping={category.grouping} />
    )
  }

  return (
    <CategoryIcon
      category={{
        id: category.categoryId ?? 0,
        grouping: category.grouping,
        name: category.name,
      }}
      className={className}
    />
  )
}

function CategoryGroupIcon({
  className,
  grouping,
}: {
  className?: string
  grouping: string
}) {
  switch (grouping) {
    case 'Entertainment':
      return <FerrisWheel className={className} />
    case 'Food and Drink':
      return <Utensils className={className} />
    case 'Home':
      return <Home className={className} />
    case 'Life':
      return <HandHelping className={className} />
    case 'Transportation':
      return <Bus className={className} />
    case 'Utilities':
      return <PlugZap className={className} />
    default:
      return <Banknote className={className} />
  }
}

function getColorByCategory(categories: MonthlySpendingCategory[]) {
  return new Map(
    categories.map((category) => [category.key, getCategoryColorFor(category)]),
  )
}

function getCategoryColorFor(category: MonthlySpendingCategory) {
  if (category.categoryId !== null) {
    const detailedColor =
      DETAILED_CATEGORY_COLORS_BY_KEY[`${category.grouping}:${category.name}`]

    if (detailedColor) return detailedColor

    return DETAILED_CATEGORY_COLOR_SPECTRUM[
      Math.abs(category.categoryId) % DETAILED_CATEGORY_COLOR_SPECTRUM.length
    ]
  }

  const palette =
    CATEGORY_COLORS_BY_GROUP[category.grouping] ?? FALLBACK_CATEGORY_COLORS

  return palette[0]
}

function getCategoryColor(
  backgroundClassName: string,
  borderClassName: string,
  foregroundClassName: string,
): CategoryColor {
  return {
    backgroundClassName,
    borderClassName,
    foregroundClassName,
  }
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

function getCategoryHoverLabel({
  amount,
  categoryLabel,
  currency,
  locale,
  month,
  roundAmounts,
  share,
}: {
  amount: number
  categoryLabel: string
  currency: Parameters<typeof formatCurrency>[0]
  locale: string
  month: MonthlySpendingMonth
  roundAmounts: boolean
  share: number
}) {
  return `${formatMonth(
    month,
    locale,
    'long',
  )} - ${categoryLabel}: ${formatChartCurrency({
    amount,
    currency,
    locale,
    roundAmounts,
  })} (${formatPercent(share, locale)})`
}

function getRangeLabel(
  range: MonthlySpendingRange,
  t: (key: string) => string,
) {
  if (range === '3') return t('RangeOptions.three')
  if (range === '6') return t('RangeOptions.six')
  if (range === '12') return t('RangeOptions.twelve')
  return t('RangeOptions.all')
}

function getShare(amount: number, total: number) {
  if (total <= 0) return 0
  return amount / total
}

function getMonthCategoriesInDisplayOrder(
  month: MonthlySpendingMonth,
  visibleCategories: MonthlySpendingCategory[],
) {
  const categoriesByKey = new Map(
    month.categories.map((category) => [category.key, category]),
  )

  return visibleCategories
    .map((category) => categoriesByKey.get(category.key))
    .filter(
      (category): category is MonthlySpendingCategory =>
        category !== undefined && category.expenseAmount > 0,
    )
}

function formatPercent(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
    style: 'percent',
  }).format(value)
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
