'use client'
import { useCurrentGroup } from '@/app/groups/[groupId]/current-group-context'
import { CategoryBreakdown } from '@/app/groups/[groupId]/stats/category-breakdown'
import { ParticipantSpendingStats } from '@/app/groups/[groupId]/stats/participant-spending'
import { RecurringSpendingStats } from '@/app/groups/[groupId]/stats/recurring-spending'
import { SpendingOverTime } from '@/app/groups/[groupId]/stats/spending-over-time'
import {
  getRangeForPeriod,
  StatsPeriod,
} from '@/app/groups/[groupId]/stats/stats-range'
import { StatsRangeSelector } from '@/app/groups/[groupId]/stats/stats-range-selector'
import { SummaryStats } from '@/app/groups/[groupId]/stats/summary-stats'
import { Totals } from '@/app/groups/[groupId]/stats/totals'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useActiveUser } from '@/lib/hooks'
import { getCurrencyFromGroup } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

export function TotalsPageClient() {
  const t = useTranslations('Stats')
  const { groupId, group } = useCurrentGroup()
  const activeUser = useActiveUser(groupId)
  const participantId =
    activeUser && activeUser !== 'None' ? activeUser : undefined

  const [period, setPeriod] = useState<StatsPeriod>('all')
  const range = getRangeForPeriod(period)

  const { data } = trpc.groups.stats.overview.useQuery({
    groupId,
    participantId,
    from: range.from,
    to: range.to,
  })

  const currency = group ? getCurrencyFromGroup(group) : undefined

  return (
    <>
      <StatsRangeSelector period={period} onPeriodChange={setPeriod} />
      <SummaryStats summary={data?.summary} currency={currency} />
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{t('Totals.title')}</CardTitle>
          <CardDescription>{t('Totals.description')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col space-y-4">
          <Totals
            totalGroupSpendings={data?.totalGroupSpendings}
            totalParticipantSpendings={data?.totalParticipantSpendings}
            totalParticipantShare={data?.totalParticipantShare}
            currency={currency}
          />
        </CardContent>
      </Card>
      <SpendingOverTime months={data?.months} currency={currency} />
      <ParticipantSpendingStats
        participants={data?.participants}
        currency={currency}
      />
      <CategoryBreakdown categories={data?.categories} currency={currency} />
      <RecurringSpendingStats recurring={data?.recurring} currency={currency} />
    </>
  )
}
