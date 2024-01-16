'use client'
import { getGroupsAction } from '@/app/groups/actions'
import {
  RecentGroups,
  getArchivedGroups,
  getRecentGroups,
  getStarredGroups,
} from '@/app/groups/recent-groups-helpers'
import { Button } from '@/components/ui/button'
import { getGroups } from '@/lib/api'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { SetStateAction, useEffect, useState } from 'react'
import { RecentGroupListCard } from './recent-group-list-card'

export type RecentGroupsState =
  | { status: 'pending' }
  | {
      status: 'partial'
      groups: RecentGroups
      starredGroups: string[]
      archivedGroups: string[]
    }
  | {
      status: 'complete'
      groups: RecentGroups
      groupsDetails: Awaited<ReturnType<typeof getGroups>>
      starredGroups: string[]
      archivedGroups: string[]
    }

function sortGroups(
  state: RecentGroupsState & { status: 'complete' | 'partial' },
) {
  const starredGroupInfo = []
  const groupInfo = []
  const archivedGroupInfo = []
  for (const group of state.groups) {
    if (state.starredGroups.includes(group.id)) {
      starredGroupInfo.push(group)
    } else if (state.archivedGroups.includes(group.id)) {
      archivedGroupInfo.push(group)
    } else {
      groupInfo.push(group)
    }
  }
  return {
    starredGroupInfo,
    groupInfo,
    archivedGroupInfo,
  }
}

export function RecentGroupList() {
  const [state, setState] = useState<RecentGroupsState>({ status: 'pending' })

  useEffect(() => {
    const groupsInStorage = getRecentGroups()
    const starredGroups = getStarredGroups()
    const archivedGroups = getArchivedGroups()
    setState({
      status: 'partial',
      groups: groupsInStorage,
      starredGroups,
      archivedGroups,
    })
    getGroupsAction(groupsInStorage.map((g) => g.id)).then((groupsDetails) => {
      setState({
        status: 'complete',
        groups: groupsInStorage,
        groupsDetails,
        starredGroups,
        archivedGroups,
      })
    })
  }, [])

  if (state.status === 'pending') {
    return (
      <p>
        <Loader2 className="w-4 m-4 mr-2 inline animate-spin" /> Loading recent
        groups…
      </p>
    )
  }

  if (state.groups.length === 0) {
    return (
      <div className="text-sm space-y-2">
        <p>You have not visited any group recently.</p>
        <p>
          <Button variant="link" asChild className="-m-4">
            <Link href={`/groups/create`}>Create one</Link>
          </Button>{' '}
          or ask a friend to send you the link to an existing one.
        </p>
      </div>
    )
  }

  const { starredGroupInfo, groupInfo, archivedGroupInfo } = sortGroups(state)

  return (
    <>
      {starredGroupInfo.length > 0 && (
        <>
          <h2 className="mb-2">Starred groups</h2>
          <GroupList
            groups={starredGroupInfo}
            state={state}
            setState={setState}
          />
        </>
      )}

      {groupInfo.length > 0 && (
        <>
          <h2 className="mt-6 mb-2">Recent groups</h2>
          <GroupList groups={groupInfo} state={state} setState={setState} />
        </>
      )}

      {archivedGroupInfo.length > 0 && (
        <>
          <h2 className="mt-6 mb-2 opacity-50">Archived groups</h2>
          <div className="opacity-50">
            <GroupList
              groups={archivedGroupInfo}
              state={state}
              setState={setState}
            />
          </div>
        </>
      )}
    </>
  )
}

function GroupList({
  groups,
  state,
  setState,
}: {
  groups: RecentGroups
  state: RecentGroupsState
  setState: (state: SetStateAction<RecentGroupsState>) => void
}) {
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {groups.map((group) => (
        <RecentGroupListCard
          key={group.id}
          group={group}
          state={state}
          setState={setState}
        />
      ))}
    </ul>
  )
}
