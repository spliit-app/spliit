'use client'
import { CategoryIcon } from '@/app/groups/[groupId]/expenses/category-icon'
import { ExpensesDialog } from '@/app/groups/[groupId]/stats/expenses-dialog'
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
import { trpc } from '@/trpc/client'
import { ChevronRight } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'

type Props = {
  groupId: string
  categories?: CategorySpending[]
  currency?: Currency
  from?: string
  to?: string
}

export function CategoryBreakdown({
  groupId,
  categories,
  currency,
  from,
  to,
}: Props) {
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
          <CategoryBars
            groupId={groupId}
            categories={categories}
            currency={currency}
            from={from}
            to={to}
          />
        )}
      </CardContent>
    </Card>
  )
}

function CategoryBars({
  groupId,
  categories,
  currency,
  from,
  to,
}: {
  groupId: string
  categories: CategorySpending[]
  currency: Currency
  from?: string
  to?: string
}) {
  const locale = useLocale()
  const t = useTranslations('Categories')
  const tByCategory = useTranslations('Stats.ByCategory')
  const [selected, setSelected] = useState<CategorySpending | null>(null)
  const total = categories.reduce((sum, category) => sum + category.total, 0)
  const max = Math.max(...categories.map((category) => category.total))

  const { data, isLoading } = trpc.groups.stats.categoryExpenses.useQuery(
    {
      groupId,
      categoryId: selected?.categoryId ?? 0,
      from,
      to,
    },
    { enabled: selected !== null },
  )

  return (
    <>
      <div className="flex flex-col gap-4">
        {categories.map((category, index) => {
          const share =
            total > 0 ? Math.round((category.total / total) * 100) : 0
          return (
            <button
              key={category.categoryId}
              type="button"
              onClick={() => setSelected(category)}
              className="group -mx-2 flex w-full cursor-pointer flex-col gap-1.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={tByCategory('showExpenses', {
                category: t(`${category.grouping}.${category.name}`),
              })}
            >
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
                <div className="flex shrink-0 items-center gap-1">
                  <span className="tabular-nums text-muted-foreground">
                    {`${formatCurrency(currency, category.total, locale)} (${share}%)`}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 transition-colors group-hover:text-muted-foreground" />
                </div>
              </div>
              <StatBar
                value={category.total}
                max={max}
                color={`hsl(var(--chart-${(index % 5) + 1}))`}
              />
            </button>
          )
        })}
      </div>

      <ExpensesDialog
        open={selected !== null}
        onClose={() => setSelected(null)}
        groupId={groupId}
        currency={currency}
        title={
          selected && (
            <>
              <CategoryIcon
                category={{
                  id: selected.categoryId,
                  grouping: selected.grouping,
                  name: selected.name,
                }}
                className="h-4 w-4 shrink-0 text-muted-foreground"
              />
              {t(`${selected.grouping}.${selected.name}`)}
            </>
          )
        }
        description={tByCategory('detailsDescription')}
        emptyText={tByCategory('detailsEmpty')}
        expenses={data?.expenses}
        isLoading={isLoading}
      />
    </>
  )
}
