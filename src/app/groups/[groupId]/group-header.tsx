'use client'

import { GroupTabs } from '@/app/groups/[groupId]/group-tabs'
import { ShareButton } from '@/app/groups/[groupId]/share-button'
import { Skeleton } from '@/components/ui/skeleton'
import { trpc } from '@/trpc/client'
import Link from 'next/link'

export const GroupHeader = ({ groupId }: { groupId: string }) => {
  const { data, isLoading } = trpc.groups.get.useQuery({ groupId })

  return (
    <div className="flex flex-col justify-between gap-3">
      <h1 className="font-bold text-2xl">
        <Link href={`/groups/${groupId}`}>
          {isLoading || !data ? (
            <Skeleton className="mt-1.5 mb-1.5 h-5 w-32" />
          ) : (
            <div className="flex">{data.group.name}</div>
          )}
        </Link>
      </h1>

      <div className="flex gap-2 justify-between">
        <GroupTabs groupId={groupId} />
        {data?.group && <ShareButton group={data.group} />}
      </div>
    </div>
  )
}
