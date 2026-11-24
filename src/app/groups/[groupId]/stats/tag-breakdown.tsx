'use client'

import { ExpensesDialog } from '@/app/groups/[groupId]/stats/expenses-dialog'
import {
  StatBar,
  StatBarListSkeleton,
} from '@/app/groups/[groupId]/stats/stat-bar'
import { TagBadge } from '@/components/tag-badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Currency } from '@/lib/currency'
import { getTagColor, TagSpending } from '@/lib/tags'
import { formatCurrency } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { ChevronRight } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'

export function TagBreakdown({
  groupId,
  tags,
  currency,
  from,
  to,
}: {
  groupId: string
  tags?: TagSpending[]
  currency?: Currency
  from?: string
  to?: string
}) {
  const t = useTranslations('Tags')
  const locale = useLocale()
  const [selected, setSelected] = useState<TagSpending | null>(null)
  const { data, isLoading, error } = trpc.groups.stats.tagExpenses.useQuery(
    { groupId, tagId: selected?.tagId ?? null, from, to },
    { enabled: selected !== null },
  )
  const name = (tag: TagSpending) =>
    tag.tagId === null ? t('untagged') : tag.name
  const max = Math.max(0, ...(tags?.map((tag) => tag.total) ?? []))

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>{t('spending')}</CardTitle>
        <CardDescription>{t('overlap')}</CardDescription>
      </CardHeader>
      <CardContent>
        {!tags || !currency ? (
          <StatBarListSkeleton />
        ) : tags.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noSpending')}</p>
        ) : (
          <div className="flex flex-col gap-4">
            {tags.map((tag) => (
              <button
                key={tag.tagId ?? 'untagged'}
                type="button"
                onClick={() => setSelected(tag)}
                aria-label={t('showExpenses', { name: name(tag) })}
                className="group -mx-2 flex w-full cursor-pointer flex-col gap-1.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 break-all">
                    {tag.tagId === null ? (
                      name(tag)
                    ) : (
                      <TagBadge name={tag.name} />
                    )}
                  </span>
                  <span className="flex shrink-0 items-center gap-1 tabular-nums text-muted-foreground">
                    {formatCurrency(currency, tag.total, locale)}
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 transition-colors group-hover:text-muted-foreground" />
                  </span>
                </div>
                <StatBar
                  value={tag.total}
                  max={max}
                  color={
                    tag.tagId === null
                      ? 'hsl(var(--muted-foreground))'
                      : getTagColor(tag.name)
                  }
                />
              </button>
            ))}
          </div>
        )}
      </CardContent>
      {currency && (
        <ExpensesDialog
          open={selected !== null}
          onClose={() => setSelected(null)}
          groupId={groupId}
          currency={currency}
          title={selected ? name(selected) : ''}
          description={t('details')}
          emptyText={error ? t('loadError') : t('noSpending')}
          expenses={error ? [] : data?.expenses}
          isLoading={isLoading}
        />
      )}
    </Card>
  )
}
