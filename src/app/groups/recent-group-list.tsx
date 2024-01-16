'use client'
import { getGroupsAction } from '@/app/groups/actions'
import {
  getArchivedGroups,
  getRecentGroups,
  getStarredGroups,
} from '@/app/groups/recent-groups-helpers'
import { Button } from '@/components/ui/button'
import { getGroups } from '@/lib/api'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { RecentGroupListCard } from './recent-group-list-card'

const recentGroupsSchema = z.array(
  z.object({
    id: z.string().min(1),
    name: z.string(),
  }),
)
type RecentGroups = z.infer<typeof recentGroupsSchema>

type State =
  | { status: 'pending' }
  | { status: 'partial'; groups: RecentGroups; starredGroups: string[] }
  | {
    status: 'complete'
    groups: RecentGroups
    groupsDetails: Awaited<ReturnType<typeof getGroups>>
    starredGroups: string[]
    archivedGroups: string[]
  }

type Props = {
  getGroupsAction: (groupIds: string[]) => ReturnType<typeof getGroups>
}

function sortGroups(state: State) {
  const starredGroupInfo = [];
  const groupInfo = [];
  const archivedGroupInfo = [];
  for (const group of state.groups) {
    if (state.starredGroups.includes(group.id)) {
      starredGroupInfo.push(group);
    }
    else if (state.archivedGroups.includes(group.id)) {
      archivedGroupInfo.push(group);
    }
    else {
      groupInfo.push(group);
    }
  }
  return {
    starredGroupInfo,
    groupInfo,
    archivedGroupInfo,
  }
}

export function RecentGroupList() {
  const [state, setState] = useState<State>({ status: 'pending' })

  useEffect(() => {
    const groupsInStorage = getRecentGroups()
    const starredGroups = getStarredGroups()
    const archivedGroups = getArchivedGroups()
    setState({ status: 'partial', groups: groupsInStorage, starredGroups, archivedGroups })
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

  const { starredGroupInfo, groupInfo, archivedGroupInfo } = sortGroups(state);

  return (
    <>
      {starredGroupInfo.length > 0 && (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {starredGroupInfo.map(group => <RecentGroupListCard group={group} state={state} setState={setState} />)
          }
        </ul>
      )}
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {groupInfo.map(group => <RecentGroupListCard group={group} state={state} setState={setState} />)
        }
      </ul>
      {archivedGroupInfo.length > 0 && (
        <>
          <h1 className="font-bold text-xl">Archived groups</h1>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {archivedGroupInfo.map(group => <RecentGroupListCard group={group} state={state} setState={setState} />)
            }
          </ul>
        </>
      )}
    </>
  )
}
