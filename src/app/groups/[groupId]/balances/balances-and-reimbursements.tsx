'use client'

import { BalancesList } from '@/app/groups/[groupId]/balances-list'
import { ReimbursementList } from '@/app/groups/[groupId]/reimbursement-list'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getGroup } from '@/lib/api'
import { trpc } from '@/trpc/client'
import { useTranslations } from 'next-intl'
import { useEffect } from 'react'

export default function BalancesAndReimbursements({
  group,
}: {
  group: NonNullable<Awaited<ReturnType<typeof getGroup>>>
}) {
  const utils = trpc.useUtils()

  useEffect(() => {
    // Until we use tRPC more widely and can invalidate the cache on expense
    // update, it's easier and safer to invalidate the cache on page load.
    utils.groups.balances.invalidate()
  }, [utils])

  const t = useTranslations('Balances')

  const { data, isLoading } = trpc.groups.balances.list.useQuery({
    groupId: group.id,
  })

  return (
    <>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading || !data ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : (
            <BalancesList
              balances={data.balances}
              participants={group.participants}
              currency={group.currency}
            />
          )}
        </CardContent>
      </Card>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{t('Reimbursements.title')}</CardTitle>
          <CardDescription>{t('Reimbursements.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading || !data ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : (
            <ReimbursementList
              reimbursements={data.reimbursements}
              participants={group.participants}
              currency={group.currency}
              groupId={group.id}
            />
          )}
        </CardContent>
      </Card>
    </>
  )
}
