'use client'
import { getGroupsAction } from '@/app/groups/actions'
import {
  archiveGroup,
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

export function RecentGroupListCard({ group, state, setState }) {

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
            <div className="text-base flex gap-2 justify-between">
              <Link
                href={`/groups/${group.id}`}
                className="flex-1 overflow-hidden text-ellipsis"
              >
                {group.name}
              </Link>
              <span className="flex-shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="-my-3 -ml-3 -mr-1.5"
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="-my-3 -mr-3 -ml-1.5"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={(event) => {
                        event.stopPropagation()
                        deleteRecentGroup(group)
                        setState({
                          ...state,
                          groups: state.groups.filter(
                            (g) => g.id !== group.id,
                          ),
                        })
                        toast.toast({
                          title: 'Group has been removed',
                          description:
                            'The group was removed from your recent groups list.',
                          action: (
                            <ToastAction
                              altText="Undo group removal"
                              onClick={() => {
                                saveRecentGroup(group)
                                setState({
                                  ...state,
                                  groups: state.groups,
                                })
                              }}
                            >
                              Undo
                            </ToastAction>
                          ),
                        })
                      }}
                    >
                      Remove from recent groups
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(event) => {
                        event.stopPropagation()
                        archiveGroup(group.id)
                        setState({
                          ...state,
                          archivedGroups: getArchivedGroups(),
                        })
                      }}
                    >
                      Archive group
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
}
