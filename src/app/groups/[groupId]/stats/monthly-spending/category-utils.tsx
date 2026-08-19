'use client'

import { CategoryIcon } from '@/app/groups/[groupId]/expenses/category-icon'
import { formatChartCurrency } from '@/lib/chart-currency'
import {
  MonthlyCategorySpending,
  MonthlySpendingCategory,
  MonthlySpendingGrouping,
  MonthlySpendingMonth,
  MonthlySpendingRange,
} from '@/lib/monthly-spending'
import { formatCurrency } from '@/lib/utils'
import {
  Banknote,
  Bus,
  FerrisWheel,
  HandHelping,
  Home,
  PlugZap,
  Utensils,
} from 'lucide-react'

export type {
  MonthlyCategorySpending,
  MonthlySpendingCategory,
  MonthlySpendingMonth,
}
export type MonthlySpendingChartType = 'bars' | 'columns'

export function GraphCategoryIcon({
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

export function getCategoryLabel(
  category: Pick<MonthlySpendingCategory, 'grouping' | 'name'>,
  grouping: MonthlySpendingGrouping,
  tCategories: (key: string) => string,
) {
  if (grouping === 'categoryGroup') {
    return tCategories(`${category.grouping}.heading`)
  }

  return tCategories(`${category.grouping}.${category.name}`)
}

export function getCategoryHoverLabel({
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

export function getRangeLabel(
  range: MonthlySpendingRange,
  t: (key: string) => string,
) {
  if (range === '3') return t('RangeOptions.three')
  if (range === '6') return t('RangeOptions.six')
  if (range === '12') return t('RangeOptions.twelve')
  return t('RangeOptions.all')
}

export function getShare(amount: number, total: number) {
  if (total <= 0) return 0
  return amount / total
}

export function getMonthCategoriesInDisplayOrder(
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

export function formatPercent(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
    style: 'percent',
  }).format(value)
}

export function formatMonth(
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
