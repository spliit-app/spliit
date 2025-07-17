'use client'
import { saveRecentGroup } from '@/app/groups/recent-groups-helpers'
import { useEffect } from 'react'
import { useCurrentGroup } from './current-group-context'

export function SaveGroupLocally() {
  const { group } = useCurrentGroup()

  useEffect(() => {
    if (group) saveRecentGroup({ id: group.id, name: group.name })
  }, [group])

  return null
}
