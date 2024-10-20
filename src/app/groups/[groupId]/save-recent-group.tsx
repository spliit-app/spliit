'use client'
import { saveRecentGroup } from '@/app/groups/recent-groups-helpers'
import { trpc } from '@/trpc/client'
import { useEffect } from 'react'

export function SaveGroupLocally({ groupId }: { groupId: string }) {
  const { data } = trpc.groups.get.useQuery({ groupId })
  const group = data?.group

  useEffect(() => {
    if (group) saveRecentGroup({ id: group.id, name: group.name })
  }, [group])

  return null
}
