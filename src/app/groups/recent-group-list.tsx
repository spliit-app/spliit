'use client'
import { getRecentGroups } from '@/app/groups/recent-groups-helpers'
import { Button } from '@/components/ui/button'
import { getGroups } from '@/lib/api'
import { Calendar, Loader2, Users } from 'lucide-react'
import Link from 'next/link'
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
  | { status: 'partial'; groups: RecentGroups }
  | {
      status: 'complete'
      groups: RecentGroups
      groupsDetails: Awaited<ReturnType<typeof getGroups>>
    }

type Props = {
  getGroupsAction: (groupIds: string[]) => ReturnType<typeof getGroups>
}

export function RecentGroupList({ getGroupsAction }: Props) {
  const [state, setState] = useState<State>({ status: 'pending' })

  useEffect(() => {
    const groupsInStorage = getRecentGroups()
    setState({ status: 'partial', groups: groupsInStorage })
    getGroupsAction(groupsInStorage.map((g) => g.id)).then((groupsDetails) => {
      setState({ status: 'complete', groups: groupsInStorage, groupsDetails })
    })
  }, [getGroupsAction])

  if (state.status === 'pending')
    return (
      <p>
        <Loader2 className="w-4 m-4 mr-2 inline animate-spin" /> Loading recent
        groups…
      </p>
    )

  return (
    <ul className="grid grid-cols-1 gap-2 mt-2 sm:grid-cols-3">
      {state.groups.map((group) => {
        const details =
          state.status === 'complete'
            ? state.groupsDetails.find((d) => d.id === group.id)
            : null
        return (
          <li key={group.id}>
            <Button variant="outline" className="h-fit w-full py-3" asChild>
              <Link href={`/groups/${group.id}`} className="text-base">
                <div className="w-full flex flex-col gap-1">
                  <div className="text-base">{group.name}</div>
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
                            {details.createdAt.toLocaleDateString('en-US', {
                              dateStyle: 'medium',
                            })}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 inline animate-spin" />
                      </>
                    )}
                  </div>
                </div>
              </Link>
            </Button>
          </li>
        )
      })}
    </ul>
  )
}
