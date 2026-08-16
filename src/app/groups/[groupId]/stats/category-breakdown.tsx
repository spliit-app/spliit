'use client'
import { CategoryIcon } from '@/app/groups/[groupId]/expenses/category-icon'
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
import { CategorySpending } from '@/lib/totals'
import { formatCurrency } from '@/lib/utils'
import { useLocale, useTranslations } from 'next-intl'

type Props = {
  categories?: CategorySpending[]
  currency?: Currency
}

export function CategoryBreakdown({ categories, currency }: Props) {
  const t = useTranslations('Stats.ByCategory')

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {!categories || !currency ? (
          <StatBarListSkeleton />
        ) : categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          <CategoryBars categories={categories} currency={currency} />
        )}
      </CardContent>
    </Card>
  )
}

function CategoryBars({
  categories,
  currency,
}: {
  categories: CategorySpending[]
  currency: Currency
}) {
  const locale = useLocale()
  const t = useTranslations('Categories')
  const total = categories.reduce((sum, category) => sum + category.total, 0)
  const max = Math.max(...categories.map((category) => category.total))

  return (
    <div className="flex flex-col gap-4">
      {categories.map((category, index) => {
        const share = total > 0 ? Math.round((category.total / total) * 100) : 0
        return (
          <div key={category.categoryId} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <CategoryIcon
                  category={{
                    id: category.categoryId,
                    grouping: category.grouping,
                    name: category.name,
                  }}
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                />
                <span className="truncate">
                  {t(`${category.grouping}.${category.name}`)}
                </span>
              </div>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatCurrency(currency, category.total, locale)} ({share}%)
              </span>
            </div>
            <StatBar
              value={category.total}
              max={max}
              color={`hsl(var(--chart-${(index % 5) + 1}))`}
            />
          </div>
        )
      })}
    </div>
  )
}
