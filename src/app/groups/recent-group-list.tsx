'use client'
import { getGroupsAction } from '@/app/groups/actions'
import {
  deleteRecentGroup,
  getArchivedGroups,
  getRecentGroups,
  getStarredGroups,
  saveRecentGroup,
  starGroup,
  unstarGroup,
} from '@/app/groups/recent-groups-helpers'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { ToastAction } from '@/components/ui/toast'
import { useToast } from '@/components/ui/use-toast'
import { getGroups } from '@/lib/api'
import { StarFilledIcon } from '@radix-ui/react-icons'
import { Calendar, Loader2, MoreHorizontal, Star, Users } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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

  const router = useRouter()
  const toast = useToast()

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

  console.log("state.groups", state.groups);

  return (
    <>
      {/* {state.groups.starredGroups.length > 0 && (
        <>
          <h1 className="font-bold text-xl">Starred</h1>
          {state.groups.starredGroups.map(groupId => {
            const details =
              state.status === 'complete'
                ? state.groupsDetails.find((details) => details.id === groupId.id)
                : null
            return (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3"></ul>
            )
          })}
        </>
      )} */}
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {state.groups
          .toSorted(
            (first, second) =>
              (state.starredGroups.includes(second.id) ? 2 : 0) -
              (state.starredGroups.includes(first.id) ? 1 : 0),
          )
          .map(group => <RecentGroupListCard group={group} state={state} setState={setState} />)
        }
      </ul>
    </>
  )
}
