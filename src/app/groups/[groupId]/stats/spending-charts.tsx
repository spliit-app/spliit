'use client'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, getCurrencyFromGroup } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { ChartPie, ChevronDown, ChevronUp } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { useCurrentGroup } from '../current-group-context'

const PIE_COLORS = [
  '#3b82f6', // blue
  '#f43f5e', // rose
  '#22c55e', // green
  '#f59e0b', // amber
  '#a855f7', // purple
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ec4899', // pink
]

type Segment = { id: string; name: string; amount: number }

function arcPath(startAngle: number, endAngle: number): string {
  const x1 = Math.sin(startAngle)
  const y1 = -Math.cos(startAngle)
  const x2 = Math.sin(endAngle)
  const y2 = -Math.cos(endAngle)
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0
  return `M 0 0 L ${x1} ${y1} A 1 1 0 ${largeArc} 1 ${x2} ${y2} Z`
}

function PieChart({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((s, seg) => s + seg.amount, 0)
  if (total === 0 || segments.length === 0) return null

  if (segments.length === 1) {
    return (
      <svg viewBox="-1.1 -1.1 2.2 2.2" className="w-full max-w-[160px] mx-auto">
        <circle cx="0" cy="0" r="1" fill={PIE_COLORS[0]} />
      </svg>
    )
  }

  const slices = segments.reduce<
    Array<Segment & { start: number; end: number; color: string }>
  >((slices, seg, i) => {
    const previousEnd = slices.at(-1)?.end ?? 0
    const sweep = (seg.amount / total) * 2 * Math.PI
    const end = i === segments.length - 1 ? 2 * Math.PI : previousEnd + sweep
    return [
      ...slices,
      {
        ...seg,
        start: previousEnd,
        end,
        color: PIE_COLORS[i % PIE_COLORS.length],
      },
    ]
  }, [])

  return (
    <svg viewBox="-1.1 -1.1 2.2 2.2" className="w-full max-w-[160px] mx-auto">
      {slices.map((slice) => (
        <path
          key={slice.id}
          d={arcPath(slice.start, slice.end)}
          fill={slice.color}
          stroke="white"
          strokeWidth="0.03"
        />
      ))}
    </svg>
  )
}

function ChartSection({
  title,
  segments,
  currency,
}: {
  title: string
  segments: Segment[]
  currency: ReturnType<typeof getCurrencyFromGroup>
}) {
  const locale = useLocale()
  const [open, setOpen] = useState(false)
  const total = segments.reduce((s, seg) => s + seg.amount, 0)

  if (segments.length === 0) return null

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="flex w-full items-center justify-between py-2.5 text-sm font-medium hover:text-foreground/80 transition-colors">
          <span>{title}</span>
          {open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col sm:flex-row gap-4 pb-4 pt-1 items-center sm:items-start">
          <div className="w-full sm:w-[160px] shrink-0">
            <PieChart segments={segments} />
          </div>
          <div className="flex flex-col gap-2 justify-center flex-1 w-full">
            {segments.map((seg, i) => {
              const pct =
                total > 0 ? ((seg.amount / total) * 100).toFixed(1) : '0'
              return (
                <div key={seg.id} className="flex items-center gap-2 text-sm">
                  <span
                    className="inline-block w-3 h-3 rounded-sm shrink-0"
                    style={{
                      backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                    }}
                  />
                  <span className="flex-1 truncate min-w-0">{seg.name}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {formatCurrency(currency, seg.amount, locale)}
                  </span>
                  <span className="text-muted-foreground tabular-nums w-10 text-right">
                    {pct}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function SpendingCharts() {
  const { groupId, group } = useCurrentGroup()
  const t = useTranslations('Stats.SpendingCharts')
  const tExpenses = useTranslations('Expenses')

  const { data } = trpc.groups.stats.get.useQuery({
    groupId,
    participantId: undefined,
  })

  if (!data || !group) {
    return (
      <div className="space-y-4">
        {[0, 1].map((index) => (
          <div key={index} className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-36 rounded-full" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Skeleton className="mx-auto h-36 w-36 rounded-full sm:mx-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full rounded-full" />
                <Skeleton className="h-4 w-4/5 rounded-full" />
                <Skeleton className="h-4 w-3/5 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const currency = getCurrencyFromGroup(group)
  const { spendingsByParticipant, sharesByParticipant } = data

  if (spendingsByParticipant.length === 0 && sharesByParticipant.length === 0) {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
          <ChartPie className="h-5 w-5" />
        </div>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          {tExpenses('noExpenses')}
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y">
      <ChartSection
        title={t('byPayer')}
        segments={spendingsByParticipant}
        currency={currency}
      />
      <ChartSection
        title={t('byShare')}
        segments={sharesByParticipant}
        currency={currency}
      />
    </div>
  )
}
