'use client'

import { formatChartCurrency } from '@/lib/chart-currency'
import {
  MonthlySpendingGrouping,
  MonthlySpendingRange,
} from '@/lib/monthly-spending'
import { cn, formatCurrency } from '@/lib/utils'
import { CategoryColor } from './category-palette'
import {
  MonthlyCategorySpending,
  formatPercent,
  getCategoryLabel,
  getRangeLabel,
  getShare,
} from './category-utils'

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
