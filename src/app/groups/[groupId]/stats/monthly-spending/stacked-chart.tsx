'use client'

import { formatChartCurrency } from '@/lib/chart-currency'
import { MonthlySpendingGrouping } from '@/lib/monthly-spending'
import { cn, formatCurrency } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { CategoryColor } from './category-palette'
import {
  GraphCategoryIcon,
  MonthlyCategorySpending,
  MonthlySpendingCategory,
  MonthlySpendingChartType,
  formatMonth,
  getCategoryHoverLabel,
  getCategoryLabel,
  getMonthCategoriesInDisplayOrder,
  getShare,
} from './category-utils'

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
