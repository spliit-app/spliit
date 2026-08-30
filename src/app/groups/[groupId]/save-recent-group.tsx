'use client'

import { saveRecentGroup } from '@/app/groups/recent-groups-helpers'
import { trpc } from '@/trpc/client'
import { useEffect } from 'react'
import { useCurrentGroup } from './current-group-context'

export function SaveGroupLocally() {
  const { group } = useCurrentGroup()
  const recordAccessMutation = trpc.groups.recordAccess.useMutation()

  useEffect(() => {
    if (group) {
      saveRecentGroup({ id: group.id, name: group.name })
      recordAccessMutation.mutate({ groupId: group.id })
    }
  }, [group?.id])

  return null
}
