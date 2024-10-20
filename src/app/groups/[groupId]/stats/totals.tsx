'use client'
import { TotalsGroupSpending } from '@/app/groups/[groupId]/stats/totals-group-spending'
import { TotalsYourShare } from '@/app/groups/[groupId]/stats/totals-your-share'
import { TotalsYourSpendings } from '@/app/groups/[groupId]/stats/totals-your-spending'
import { Skeleton } from '@/components/ui/skeleton'
import { useActiveUser } from '@/lib/hooks'
import { trpc } from '@/trpc/client'

export function Totals({ groupId }: { groupId: string }) {
  const activeUser = useActiveUser(groupId)

  const participantId =
    activeUser && activeUser !== 'None' ? activeUser : undefined
  const { data } = trpc.groups.stats.get.useQuery({ groupId, participantId })
  const { data: groupData } = trpc.groups.get.useQuery({ groupId })

  if (!data || !groupData)
    return (
      <div className="flex flex-col gap-7">
        {[0, 1, 2].map((index) => (
          <div key={index}>
            <Skeleton className="mt-1 h-3 w-48" />
            <Skeleton className="mt-3 h-4 w-20" />
          </div>
        ))}
      </div>
    )

  const {
    totalGroupSpendings,
    totalParticipantShare,
    totalParticipantSpendings,
  } = data
  const { group } = groupData

  return (
    <>
      <TotalsGroupSpending
        totalGroupSpendings={totalGroupSpendings}
        currency={group.currency}
      />
      {participantId && (
        <>
          <TotalsYourSpendings
            totalParticipantSpendings={totalParticipantSpendings}
            currency={group.currency}
          />
          <TotalsYourShare
            totalParticipantShare={totalParticipantShare}
            currency={group.currency}
          />
        </>
      )}
    </>
  )
}
