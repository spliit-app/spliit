'use client'

import { formatChartCurrency } from '@/lib/chart-currency'
import { MonthlySpendingGrouping } from '@/lib/monthly-spending'
import { formatCurrency } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { useLayoutEffect, useRef } from 'react'
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
  includeYear,
  locale,
  monthlyCategorySpending,
  roundAmounts,
  tCategories,
  visibleCategories,
}: {
  chartType: MonthlySpendingChartType
  colorByCategory: Map<string, string>
  currency: Parameters<typeof formatCurrency>[0]
  grouping: MonthlySpendingGrouping
  includeYear: boolean
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
          includeYear={includeYear}
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
          includeYear={includeYear}
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
  includeYear,
  locale,
  monthlyCategorySpending,
  roundAmounts,
  tCategories,
  visibleCategories,
}: {
  colorByCategory: Map<string, string>
  currency: Parameters<typeof formatCurrency>[0]
  grouping: MonthlySpendingGrouping
  includeYear: boolean
  locale: string
  monthlyCategorySpending: MonthlyCategorySpending
  roundAmounts: boolean
  tCategories: (key: string) => string
  visibleCategories: MonthlySpendingCategory[]
}) {
  return (
    <div className="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
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
            className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2 text-sm sm:grid-cols-[6rem_minmax(0,1fr)]"
          >
            <div className="text-muted-foreground">
              {formatMonth(month, locale, 'short', includeYear)}
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
                        className="flex h-full min-w-[2px] items-center justify-start gap-1 overflow-hidden border-y border-transparent px-1.5 text-[11px] font-medium"
                        key={category.key}
                        style={{
                          width: `${share * 100}%`,
                          backgroundColor: color,
                          color: 'hsl(var(--background))',
                        }}
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
                            className="h-3.5 w-3.5 shrink-0 opacity-80"
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
  includeYear,
  locale,
  monthlyCategorySpending,
  roundAmounts,
  tCategories,
  visibleCategories,
}: {
  colorByCategory: Map<string, string>
  currency: Parameters<typeof formatCurrency>[0]
  grouping: MonthlySpendingGrouping
  includeYear: boolean
  locale: string
  monthlyCategorySpending: MonthlyCategorySpending
  roundAmounts: boolean
  tCategories: (key: string) => string
  visibleCategories: MonthlySpendingCategory[]
}) {
  const columnCount = monthlyCategorySpending.months.length
  const columnWidthRem = 3.25
  const scrollerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    scroller.scrollLeft = scroller.scrollWidth
  }, [columnCount])

  return (
    <div className="overflow-x-auto pb-1" dir="ltr" ref={scrollerRef}>
      <div
        className="grid items-end gap-1 sm:gap-2"
        style={{
          gridTemplateColumns: `repeat(${columnCount}, ${columnWidthRem}rem)`,
        }}
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
          const monthTitle = `${formatMonth(
            month,
            locale,
            'long',
          )}: ${formatChartCurrency({
            amount: month.expenseAmount,
            currency,
            locale,
            roundAmounts,
          })}`

          return (
            <div
              className="flex min-w-0 flex-col items-center gap-2"
              key={month.key}
            >
              <div className="flex h-56 w-full flex-col items-center justify-end">
                <div className="mb-1 max-w-full truncate px-0.5 text-center text-[10px] leading-none text-muted-foreground">
                  {formatChartCurrency({
                    amount: month.expenseAmount,
                    currency,
                    locale,
                    roundAmounts,
                  })}
                </div>
                <div
                  className="flex w-full max-w-14 items-end rounded-md bg-muted"
                  style={{
                    height:
                      columnHeightPercent > 0
                        ? `calc(12rem * ${columnHeightPercent / 100})`
                        : '0px',
                  }}
                  title={monthTitle}
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
                          className="flex min-h-[3px] items-center justify-center overflow-hidden border-x border-transparent px-0.5"
                          key={category.key}
                          style={{
                            height: `${share * 100}%`,
                            backgroundColor: color,
                            color: 'hsl(var(--background))',
                          }}
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
                              className="h-3.5 w-3.5 shrink-0 opacity-80"
                              grouping={grouping}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div className="w-full min-w-0 text-center text-[10px] leading-tight text-muted-foreground">
                <div className="truncate">
                  {formatMonth(month, locale, 'narrow')}
                </div>
                {includeYear && <div>{month.year}</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
