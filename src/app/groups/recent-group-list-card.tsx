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
  ChevronRight,
  MoreHorizontal,
  Star,
  Users,
  X,
} from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'

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
  const locale = useLocale()
  const toast = useToast()
  const t = useTranslations('Groups')
  const tExpenses = useTranslations('Expenses')
  const canManageGroup =
    isLoggedIn &&
    (associatedGroupIds.includes(group.id) || activeGroupIds.includes(group.id))

  return (
    <li
      key={group.id}
      className="group relative rounded-lg border bg-card p-4 transition-colors hover:bg-accent/40"
    >
      <Link
        href={`/groups/${group.id}`}
        className="absolute inset-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={group.name}
      />
      <div className="relative z-10 flex items-start gap-3 pr-16 pointer-events-none">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-background text-primary">
          <Users className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold leading-6 text-foreground">
                {group.name}
              </h3>
              <div className="mt-1 text-xs text-muted-foreground">
                {groupDetail ? (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {groupDetail._count.participants}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(groupDetail.createdAt).toLocaleDateString(
                        locale,
                        {
                          dateStyle: 'medium',
                        },
                      )}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-10 rounded-full" />
                    <Skeleton className="h-4 w-24 rounded-full" />
                  </div>
                )}
              </div>
            </div>
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
          </div>
        </div>
      </div>

      <div
        className="absolute right-2 top-2 z-20 flex pointer-events-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => {
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
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canManageGroup && (
              <DropdownMenuItem asChild>
                <Link
                  prefetch={false}
                  href={`/groups/${group.id}/backup/export`}
                  title={tExpenses('exportBackup')}
                >
                  <Archive className="w-4 h-4 mr-2" />
                  {tExpenses('exportBackup')}
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => {
                if (isArchived) {
                  unarchiveGroup(group.id)
                } else {
                  archiveGroup(group.id)
                  unstarGroup(group.id)
                }
                refreshGroupsFromStorage()
              }}
            >
              {isArchived ? (
                <ArchiveX className="w-4 h-4 mr-2" />
              ) : (
                <Archive className="w-4 h-4 mr-2" />
              )}
              {t(isArchived ? 'unarchive' : 'archive')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                deleteRecentGroup(group)
                refreshGroupsFromStorage()

                toast.toast({
                  title: t('RecentRemovedToast.title'),
                  description: t('RecentRemovedToast.description'),
                })
              }}
            >
              <X className="w-4 h-4 mr-2" />
              {t('removeRecent')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  )
}
