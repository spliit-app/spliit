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
import { Skeleton } from '@/components/ui/skeleton'
import { trpc } from '@/trpc/client'
import { useTranslations } from 'next-intl'
import { Fragment, useEffect } from 'react'

export default function BalancesAndReimbursements({
  groupId,
}: {
  groupId: string
}) {
  const utils = trpc.useUtils()
  const { data: groupData, isLoading: groupIsLoading } =
    trpc.groups.get.useQuery({ groupId })
  const { data: balancesData, isLoading: balancesAreLoading } =
    trpc.groups.balances.list.useQuery({
      groupId,
    })
  const t = useTranslations('Balances')

  useEffect(() => {
    // Until we use tRPC more widely and can invalidate the cache on expense
    // update, it's easier and safer to invalidate the cache on page load.
    utils.groups.balances.invalidate()
  }, [utils])

  const isLoading =
    balancesAreLoading || !balancesData || groupIsLoading || !groupData?.group

  return (
    <>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <BalancesLoading
              participantCount={groupData?.group.participants.length}
            />
          ) : (
            <BalancesList
              balances={balancesData.balances}
              participants={groupData.group.participants}
              currency={groupData.group.currency}
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
          {isLoading ? (
            <ReimbursementsLoading
              participantCount={groupData?.group.participants.length}
            />
          ) : (
            <ReimbursementList
              reimbursements={balancesData.reimbursements}
              participants={groupData.group.participants}
              currency={groupData.group.currency}
              groupId={groupData.group.id}
            />
          )}
        </CardContent>
      </Card>
    </>
  )
}

const ReimbursementsLoading = ({
  participantCount = 3,
}: {
  participantCount?: number
}) => {
  return (
    <div className="flex flex-col">
      {Array(participantCount - 1)
        .fill(undefined)
        .map((_, index) => (
          <div key={index} className="flex justify-between py-5">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
    </div>
  )
}

const BalancesLoading = ({
  participantCount = 3,
}: {
  participantCount?: number
}) => {
  return (
    <div className="grid grid-cols-2 py-1 gap-y-2">
      {Array(participantCount)
        .fill(undefined)
        .map((_, index) =>
          index % 2 === 0 ? (
            <Fragment key={index}>
              <div className="flex items-center justify-end pr-2">
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="self-start">
                <Skeleton
                  className={`h-7 w-${(index % 3) + 1}/3 rounded-l-none`}
                />
              </div>
            </Fragment>
          ) : (
            <Fragment key={index}>
              <div className="flex items-center justify-end">
                <Skeleton
                  className={`h-7 w-${(index % 3) + 1}/3 rounded-r-none`}
                />
              </div>
              <div className="flex items-center pl-2">
                <Skeleton className="h-3 w-16" />
              </div>
            </Fragment>
          ),
        )}
    </div>
  )
}
