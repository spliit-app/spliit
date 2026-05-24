'use client'

import { GroupTabs } from '@/app/groups/[groupId]/group-tabs'
import { ShareButton } from '@/app/groups/[groupId]/share-button'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { useCurrentGroup } from './current-group-context'

export const GroupHeader = () => {
  const { isLoading, groupId, group } = useCurrentGroup()

  return (
    <div className="flex flex-col gap-2">
      {/* Title row — always visible on all screen sizes */}
      <div className="flex items-center gap-2 min-w-0">
        <h1 className="font-bold text-xl sm:text-2xl flex-1 min-w-0 truncate">
          <Link href={`/groups/${groupId}`}>
            {isLoading ? (
              <Skeleton className="mt-1.5 mb-1.5 h-5 w-32" />
            ) : (
              group.name
            )}
          </Link>
        </h1>
        {group && <ShareButton group={group} />}
      </div>

      {/* GroupTabs: renders desktop tab bar inline (hidden on mobile)
          and a fixed bottom navigation bar (hidden on sm+) */}
      <GroupTabs groupId={groupId} />
    </div>
  )
}
