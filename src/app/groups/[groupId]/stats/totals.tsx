'use client'
import { TotalsGroupSpending } from '@/app/groups/[groupId]/stats/totals-group-spending'
import { TotalsYourShare } from '@/app/groups/[groupId]/stats/totals-your-share'
import { TotalsYourSpendings } from '@/app/groups/[groupId]/stats/totals-your-spending'
import { Skeleton } from '@/components/ui/skeleton'
import { useActiveUser } from '@/lib/hooks'
import { trpc } from '@/trpc/client'
import { useCurrentGroup } from '../current-group-context'

export function Totals() {
  const { groupId, group } = useCurrentGroup()
  const activeUser = useActiveUser(groupId)

  const participantId =
    activeUser && activeUser !== 'None' ? activeUser : undefined
  const { data } = trpc.groups.stats.get.useQuery({ groupId, participantId })

  if (!data || !group)
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
