'use client'

import { AddGroupByUrlButton } from '@/app/groups/add-group-by-url-button'
import {
  getArchivedGroups,
  getRecentGroups,
  getStarredGroups,
  RecentGroups,
} from '@/app/groups/recent-groups-helpers'
import { Button } from '@/components/ui/button'
import { getGroups } from '@/lib/api'
import { MAX_GROUPS_PER_QUERY } from '@/lib/group-query-limits'
import { trpc } from '@/trpc/client'
import { AppRouterOutput } from '@/trpc/routers/_app'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import {
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { GlobalBalanceCard } from './global-balance-card'
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

function sortGroups({
  groups,
  starredGroups,
  archivedGroups,
}: {
  groups: RecentGroups
  starredGroups: string[]
  archivedGroups: string[]
}) {
  const starredGroupInfo = []
  const groupInfo = []
  const archivedGroupInfo = []
  for (const group of groups) {
    if (starredGroups.includes(group.id)) {
      starredGroupInfo.push(group)
    } else if (archivedGroups.includes(group.id)) {
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

  const loadGroups = useCallback(() => {
    const groupsInStorage = getRecentGroups()
    const starredGroups = getStarredGroups()
    const archivedGroups = getArchivedGroups()
    setState({
      status: 'partial',
      groups: groupsInStorage,
      starredGroups,
      archivedGroups,
    })
  }, [])

  useEffect(() => {
    loadGroups()
  }, [loadGroups])

  if (state.status === 'pending') return null

  return (
    <RecentGroupList_
      recentGroupIds={state.groups.map((group) => group.id)}
      starredGroups={state.starredGroups}
      archivedGroups={state.archivedGroups}
      refreshGroupsFromStorage={loadGroups}
    />
  )
}

function RecentGroupList_({
  recentGroupIds,
  starredGroups,
  archivedGroups,
  refreshGroupsFromStorage,
}: {
  /** Recency hint from localStorage; it no longer decides membership. */
  recentGroupIds: string[]
  starredGroups: string[]
  archivedGroups: string[]
  refreshGroupsFromStorage: () => void
}) {
  const t = useTranslations('Groups')
  // Membership comes from the account (a linked participant), not from this
  // browser: two accounts sharing a browser used to see each other's groups.
  const { data, isLoading, isError, refetch } = trpc.groups.mine.useQuery()

  const groups: RecentGroups = useMemo(() => {
    if (!data) return []
    const byId = new Map(data.groups.map((group) => [group.id, group]))
    const stored = recentGroupIds
      .filter((id) => byId.has(id))
      .slice(0, MAX_GROUPS_PER_QUERY)
    const rest = data.groups
      .filter((group) => !stored.includes(group.id))
      .map((group) => group.id)
    return [...stored, ...rest].map((id) => ({
      id,
      name: byId.get(id)!.name,
    }))
  }, [data, recentGroupIds])

  if (isError) {
    return (
      <GroupsPage reload={refreshGroupsFromStorage}>
        <div className="text-sm space-y-2">
          <p>{t('loadError')}</p>
          <Button variant="secondary" onClick={() => refetch()}>
            {t('retry')}
          </Button>
        </div>
      </GroupsPage>
    )
  }

  if (isLoading || !data) {
    return (
      <GroupsPage reload={refreshGroupsFromStorage}>
        <p>
          <Loader2 className="w-4 m-4 mr-2 inline animate-spin" />{' '}
          {t('loadingRecent')}
        </p>
      </GroupsPage>
    )
  }

  if (groups.length === 0) {
    return (
      <GroupsPage reload={refreshGroupsFromStorage}>
        <div className="text-sm space-y-2">
          <p>{t('NoRecent.description')}</p>
          <p className="text-muted-foreground">
            {t('NoRecent.claimedDescription')}
          </p>
          <p>
            <Button variant="link" asChild className="-m-4">
              <Link href={`/groups/create`}>{t('NoRecent.create')}</Link>
            </Button>{' '}
            {t('NoRecent.orAsk')}
          </p>
        </div>
      </GroupsPage>
    )
  }

  const { starredGroupInfo, groupInfo, archivedGroupInfo } = sortGroups({
    groups,
    starredGroups,
    archivedGroups,
  })

  return (
    <GroupsPage reload={refreshGroupsFromStorage}>
      <GlobalBalanceCard groups={groups} />

      {starredGroupInfo.length > 0 && (
        <>
          <h2 className="mb-2">{t('starred')}</h2>
          <GroupList
            groups={starredGroupInfo}
            groupDetails={data.groups}
            archivedGroups={archivedGroups}
            starredGroups={starredGroups}
            refreshGroupsFromStorage={refreshGroupsFromStorage}
          />
        </>
      )}

      {groupInfo.length > 0 && (
        <>
          <h2 className="mt-6 mb-2">{t('recent')}</h2>
          <GroupList
            groups={groupInfo}
            groupDetails={data.groups}
            archivedGroups={archivedGroups}
            starredGroups={starredGroups}
            refreshGroupsFromStorage={refreshGroupsFromStorage}
          />
        </>
      )}

      {archivedGroupInfo.length > 0 && (
        <>
          <h2 className="mt-6 mb-2 opacity-50">{t('archived')}</h2>
          <div className="opacity-50">
            <GroupList
              groups={archivedGroupInfo}
              groupDetails={data.groups}
              archivedGroups={archivedGroups}
              starredGroups={starredGroups}
              refreshGroupsFromStorage={refreshGroupsFromStorage}
            />
          </div>
        </>
      )}
    </GroupsPage>
  )
}

function GroupList({
  groups,
  groupDetails,
  starredGroups,
  archivedGroups,
  refreshGroupsFromStorage,
}: {
  groups: RecentGroups
  groupDetails?: AppRouterOutput['groups']['mine']['groups']
  starredGroups: string[]
  archivedGroups: string[]
  refreshGroupsFromStorage: () => void
}) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {groups.map((group) => (
        <RecentGroupListCard
          key={group.id}
          group={group}
          groupDetail={groupDetails?.find(
            (groupDetail) => groupDetail.id === group.id,
          )}
          isStarred={starredGroups.includes(group.id)}
          isArchived={archivedGroups.includes(group.id)}
          refreshGroupsFromStorage={refreshGroupsFromStorage}
        />
      ))}
    </ul>
  )
}

function GroupsPage({
  children,
  reload,
}: PropsWithChildren<{ reload: () => void }>) {
  const t = useTranslations('Groups')
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h1 className="font-bold text-2xl flex-1">
          <Link href="/groups">{t('myGroups')}</Link>
        </h1>
        <div className="flex gap-2">
          <AddGroupByUrlButton reload={reload} />
          <Button asChild>
            <Link href="/groups/create">
              {/* <Plus className="w-4 h-4 mr-2" /> */}
              {t('create')}
            </Link>
          </Button>
        </div>
      </div>
      <div>{children}</div>
    </>
  )
}
