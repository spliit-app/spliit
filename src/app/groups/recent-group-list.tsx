'use client'
import { getGroupsAction } from '@/app/groups/actions'
import {
  getRecentGroups,
  getStarredGroups,
  starGroup,
  unstarGroup,
} from '@/app/groups/recent-groups-helpers'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getGroups } from '@/lib/api'
import { StarFilledIcon } from '@radix-ui/react-icons'
import { Calendar, Loader2, Star, Users } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { z } from 'zod'

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
    }

type Props = {
  getGroupsAction: (groupIds: string[]) => ReturnType<typeof getGroups>
}

export function RecentGroupList() {
  const [state, setState] = useState<State>({ status: 'pending' })

  useEffect(() => {
    const groupsInStorage = getRecentGroups()
    const starredGroups = getStarredGroups()
    setState({ status: 'partial', groups: groupsInStorage, starredGroups })
    getGroupsAction(groupsInStorage.map((g) => g.id)).then((groupsDetails) => {
      setState({
        status: 'complete',
        groups: groupsInStorage,
        groupsDetails,
        starredGroups,
      })
    })
  }, [])

  const router = useRouter()

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

  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {state.groups
        .toSorted(
          (first, second) =>
            (state.starredGroups.includes(second.id) ? 2 : 0) -
            (state.starredGroups.includes(first.id) ? 1 : 0),
        )
        .map((group) => {
          const details =
            state.status === 'complete'
              ? state.groupsDetails.find((d) => d.id === group.id)
              : null
          return (
            <li key={group.id}>
              <Button variant="outline" className="h-fit w-full py-3" asChild>
                <div
                  className="text-base"
                  onClick={() => router.push(`/groups/${group.id}`)}
                >
                  <div className="w-full flex flex-col gap-1">
                    <div className="text-base flex justify-between">
                      <Link href={`/groups/${group.id}`}>{group.name}</Link>
                      <span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="-m-3"
                          onClick={(event) => {
                            event.stopPropagation()
                            if (state.starredGroups.includes(group.id)) {
                              unstarGroup(group.id)
                            } else {
                              starGroup(group.id)
                            }
                            setState({
                              ...state,
                              starredGroups: getStarredGroups(),
                            })
                          }}
                        >
                          {state.starredGroups.includes(group.id) ? (
                            <StarFilledIcon className="w-4 h-4 text-orange-400" />
                          ) : (
                            <Star className="w-4 h-4 text-muted-foreground" />
                          )}
                        </Button>
                      </span>
                    </div>
                    <div className="text-muted-foreground font-normal text-xs">
                      {details ? (
                        <div className="w-full flex items-center justify-between">
                          <div className="flex items-center">
                            <Users className="w-3 h-3 inline mr-1" />
                            <span>{details._count.participants}</span>
                          </div>
                          <div className="flex items-center">
                            <Calendar className="w-3 h-3 inline mx-1" />
                            <span>
                              {new Date(details.createdAt).toLocaleDateString(
                                'en-US',
                                {
                                  dateStyle: 'medium',
                                },
                              )}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between">
                          <Skeleton className="h-4 w-6 rounded-full" />
                          <Skeleton className="h-4 w-24 rounded-full" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Button>
            </li>
          )
        })}
    </ul>
  )
}
