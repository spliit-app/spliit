'use client'

import { MonthlySpendingGrouping } from '@/lib/monthly-spending'
import { cn } from '@/lib/utils'
import {
  GraphCategoryIcon,
  MonthlySpendingCategory,
  getCategoryLabel,
} from './category-utils'

export function MonthlySpendingLegend({
  categories,
  className,
  colorByCategory,
  grouping,
  isVertical = false,
  tCategories,
}: {
  categories: MonthlySpendingCategory[]
  className?: string
  colorByCategory: Map<string, string>
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
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border"
            style={{
              backgroundColor: colorByCategory.get(category.key),
              color: 'hsl(var(--background))',
            }}
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
