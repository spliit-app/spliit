'use client'

import { AddGroupByUrlButton } from '@/app/groups/add-group-by-url-button'
import {
  RecentGroups,
  archiveGroup,
  getArchivedGroups,
  getRecentGroups,
  getStarredGroups,
  saveRecentGroup,
  starGroup,
} from '@/app/groups/recent-groups-helpers'
import { Button } from '@/components/ui/button'
import { trpc } from '@/trpc/client'
import { AppRouterOutput } from '@/trpc/routers/_app'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { PropsWithChildren, useEffect, useState } from 'react'
import { GlobalBalanceCard } from './global-balance-card'
import { RecentGroupListCard } from './recent-group-list-card'

export type RecentGroupsState =
  | { status: 'pending' }
  | {
      status: 'complete'
      groups: RecentGroups
      starredGroups: string[]
      archivedGroups: string[]
      groupsDetails?: AppRouterOutput['groups']['list']['groups']
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
  const syncMutation = trpc.groups.sync.useMutation()

  async function loadAndSyncGroups() {
    const localGroups = getRecentGroups()
    const localStarred = getStarredGroups()
    const localArchived = getArchivedGroups()

    try {
      const syncResult = await syncMutation.mutateAsync({
        localGroupIds: localGroups.map((g) => g.id),
        starredGroupIds: localStarred,
        archivedGroupIds: localArchived,
      })

      if (syncResult.isAuthenticated) {
        // Sync user groups to local storage for offline / cached use
        for (const g of syncResult.groups) {
          saveRecentGroup({ id: g.id, name: g.name })
          if (g.isStarred) starGroup(g.id)
          if (g.isArchived) archiveGroup(g.id)
        }

        const syncedGroups: RecentGroups = syncResult.groups.map((g) => ({
          id: g.id,
          name: g.name,
        }))
        const starred = syncResult.groups
          .filter((g) => g.isStarred)
          .map((g) => g.id)
        const archived = syncResult.groups
          .filter((g) => g.isArchived)
          .map((g) => g.id)

        setState({
          status: 'complete',
          groups: syncedGroups,
          starredGroups: starred,
          archivedGroups: archived,
          groupsDetails: syncResult.groups,
        })
      } else {
        setState({
          status: 'complete',
          groups: localGroups,
          starredGroups: localStarred,
          archivedGroups: localArchived,
          groupsDetails: syncResult.groups,
        })
      }
    } catch {
      setState({
        status: 'complete',
        groups: localGroups,
        starredGroups: localStarred,
        archivedGroups: localArchived,
      })
    }
  }

  useEffect(() => {
    loadAndSyncGroups()
  }, [])

  if (state.status === 'pending') {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground">Loading groups...</span>
      </div>
    )
  }

  return (
    <RecentGroupList_
      groups={state.groups}
      starredGroups={state.starredGroups}
      archivedGroups={state.archivedGroups}
      groupsDetails={state.groupsDetails}
      refreshGroupsFromStorage={loadAndSyncGroups}
    />
  )
}

function RecentGroupList_({
  groups,
  starredGroups,
  archivedGroups,
  groupsDetails,
  refreshGroupsFromStorage,
}: {
  groups: RecentGroups
  starredGroups: string[]
  archivedGroups: string[]
  groupsDetails?: AppRouterOutput['groups']['list']['groups']
  refreshGroupsFromStorage: () => void
}) {
  const t = useTranslations('Groups')

  if (groups.length === 0) {
    return (
      <GroupsPage reload={refreshGroupsFromStorage}>
        <div className="text-sm space-y-2">
          <p>{t('NoRecent.description')}</p>
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
          <h2 className="mb-2 font-semibold">{t('starred')}</h2>
          <GroupList
            groups={starredGroupInfo}
            groupDetails={groupsDetails}
            archivedGroups={archivedGroups}
            starredGroups={starredGroups}
            refreshGroupsFromStorage={refreshGroupsFromStorage}
          />
        </>
      )}

      {groupInfo.length > 0 && (
        <>
          <h2 className="mt-6 mb-2 font-semibold">{t('recent')}</h2>
          <GroupList
            groups={groupInfo}
            groupDetails={groupsDetails}
            archivedGroups={archivedGroups}
            starredGroups={starredGroups}
            refreshGroupsFromStorage={refreshGroupsFromStorage}
          />
        </>
      )}

      {archivedGroupInfo.length > 0 && (
        <>
          <h2 className="mt-6 mb-2 font-semibold opacity-50">
            {t('archived')}
          </h2>
          <div className="opacity-50">
            <GroupList
              groups={archivedGroupInfo}
              groupDetails={groupsDetails}
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
  groupDetails?: AppRouterOutput['groups']['list']['groups']
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
            <Link href="/groups/create">{t('create')}</Link>
          </Button>
        </div>
      </div>
      <div>{children}</div>
    </>
  )
}
