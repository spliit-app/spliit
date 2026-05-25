import {
  RecentGroup,
  archiveGroup,
  deleteRecentGroup,
  starGroup,
  unarchiveGroup,
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
import { useToast } from '@/components/ui/use-toast'
import { AppRouterOutput } from '@/trpc/routers/_app'
import { StarFilledIcon } from '@radix-ui/react-icons'
import {
  Archive,
  ArchiveX,
  Calendar,
  MoreHorizontal,
  Star,
  Users,
  X,
} from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export function RecentGroupListCard({
  group,
  groupDetail,
  isStarred,
  isArchived,
  refreshGroupsFromStorage,
  isLoggedIn,
  associatedGroupIds,
  activeGroupIds,
}: {
  group: RecentGroup
  groupDetail?: AppRouterOutput['groups']['list']['groups'][number]
  isStarred: boolean
  isArchived: boolean
  refreshGroupsFromStorage: () => void
  isLoggedIn: boolean
  associatedGroupIds: string[]
  activeGroupIds: string[]
}) {
  const router = useRouter()
  const locale = useLocale()
  const toast = useToast()
  const t = useTranslations('Groups')
  const tExpenses = useTranslations('Expenses')
  const canManageGroup =
    isLoggedIn &&
    (associatedGroupIds.includes(group.id) || activeGroupIds.includes(group.id))

  return (
    <li key={group.id}>
      <Button
        variant="secondary"
        className="h-fit w-full py-3.5 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow touch-manipulation"
        asChild
      >
        <div
          className="text-base"
          onClick={() => router.push(`/groups/${group.id}`)}
        >
          <div className="w-full flex flex-col gap-1.5">
            <div className="text-base font-medium flex gap-2 justify-between">
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
                    if (isStarred) {
                      unstarGroup(group.id)
                    } else {
                      starGroup(group.id)
                      unarchiveGroup(group.id)
                    }
                    refreshGroupsFromStorage()
                  }}
                >
                  {isStarred ? (
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
                    {canManageGroup && (
                      <DropdownMenuItem asChild>
                        <Link
                          prefetch={false}
                          href={`/groups/${group.id}/backup/export`}
                          target="_blank"
                          title={tExpenses('exportBackup')}
                          onClick={(event) => {
                            event.stopPropagation()
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <Archive className="w-4 h-4" />
                            <p>{tExpenses('exportBackup')}</p>
                          </div>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={(event) => {
                        event.stopPropagation()
                        if (isArchived) {
                          unarchiveGroup(group.id)
                        } else {
                          archiveGroup(group.id)
                          unstarGroup(group.id)
                        }
                        refreshGroupsFromStorage()
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {isArchived ? (
                          <ArchiveX className="w-4 h-4" />
                        ) : (
                          <Archive className="w-4 h-4" />
                        )}
                        <p>{t(isArchived ? 'unarchive' : 'archive')}</p>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(event) => {
                        event.stopPropagation()
                        deleteRecentGroup(group)
                        refreshGroupsFromStorage()

                        toast.toast({
                          title: t('RecentRemovedToast.title'),
                          description: t('RecentRemovedToast.description'),
                        })
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <X className="w-4 h-4" />
                        <p>{t('removeRecent')}</p>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </span>
            </div>
            <div className="text-muted-foreground font-normal text-xs">
              {groupDetail ? (
                <div className="w-full flex items-center justify-between">
                  <div className="flex items-center">
                    <Users className="w-3 h-3 inline mr-1" />
                    <span>{groupDetail._count.participants}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-3 h-3 inline mx-1" />
                    <span>
                      {new Date(groupDetail.createdAt).toLocaleDateString(
                        locale,
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
