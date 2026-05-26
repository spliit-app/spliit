'use client'
import { AddGroupByUrlButton } from '@/app/groups/add-group-by-url-button'
import {
  GROUP_LIST_PREFERENCES_CHANGED_EVENT,
  RecentGroups,
  getArchivedGroups,
  getHideArchivedGroupsEnabled,
  getRecentGroups,
  getStarredGroups,
} from '@/app/groups/recent-groups-helpers'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ASSOCIATED_GROUPS_KEY } from '@/lib/anonymous-constants'
import { getGroups } from '@/lib/api'
import { trpc } from '@/trpc/client'
import { AppRouterOutput } from '@/trpc/routers/_app'
import { Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { PropsWithChildren, useEffect, useState } from 'react'
import { RecentGroupListCard } from './recent-group-list-card'

export type RecentGroupsState =
  | { status: 'pending' }
  | {
      status: 'partial'
      groups: RecentGroups
      starredGroups: string[]
      archivedGroups: string[]
      hideArchivedGroups: boolean
    }
  | {
      status: 'complete'
      groups: RecentGroups
      groupsDetails: Awaited<ReturnType<typeof getGroups>>
      starredGroups: string[]
      archivedGroups: string[]
      hideArchivedGroups: boolean
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

  function loadGroups() {
    const groupsInStorage = getRecentGroups()
    const starredGroups = getStarredGroups()
    const archivedGroups = getArchivedGroups()
    const hideArchivedGroups = getHideArchivedGroupsEnabled()
    setState({
      status: 'partial',
      groups: groupsInStorage,
      starredGroups,
      archivedGroups,
      hideArchivedGroups,
    })
  }

  useEffect(() => {
    loadGroups()
    window.addEventListener(GROUP_LIST_PREFERENCES_CHANGED_EVENT, loadGroups)
    return () => {
      window.removeEventListener(
        GROUP_LIST_PREFERENCES_CHANGED_EVENT,
        loadGroups,
      )
    }
  }, [])

  if (state.status === 'pending') return null

  return (
    <RecentGroupList_
      groups={state.groups}
      starredGroups={state.starredGroups}
      archivedGroups={state.archivedGroups}
      hideArchivedGroups={state.hideArchivedGroups}
      refreshGroupsFromStorage={() => loadGroups()}
    />
  )
}

function RecentGroupList_({
  groups,
  starredGroups,
  archivedGroups,
  hideArchivedGroups,
  refreshGroupsFromStorage,
}: {
  groups: RecentGroups
  starredGroups: string[]
  archivedGroups: string[]
  hideArchivedGroups: boolean
  refreshGroupsFromStorage: () => void
}) {
  const t = useTranslations('Groups')
  const { data, isLoading } = trpc.groups.list.useQuery({
    groupIds: groups.map((group) => group.id),
  })

  // Get login state and associated groups from localStorage
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [associatedGroupIds, setAssociatedGroupIds] = useState<string[]>([])
  const [activeGroupIds, setActiveGroupIds] = useState<string[]>([])

  useEffect(() => {
    const linkedStatus = localStorage.getItem('anonymousLinked')
    setIsLoggedIn(linkedStatus === 'true')

    const storedAssociations = localStorage.getItem(ASSOCIATED_GROUPS_KEY)
    setAssociatedGroupIds(
      storedAssociations ? (JSON.parse(storedAssociations) as string[]) : [],
    )
  }, [])

  useEffect(() => {
    if (!data?.groups) return
    const storedAssociations = localStorage.getItem(ASSOCIATED_GROUPS_KEY)
    const currentAssociations = storedAssociations
      ? (JSON.parse(storedAssociations) as string[])
      : []
    const existingGroupIds = new Set(data.groups.map((group) => group.id))
    const nextAssociations = currentAssociations.filter((groupId) =>
      existingGroupIds.has(groupId),
    )
    if (nextAssociations.length !== currentAssociations.length) {
      localStorage.setItem(
        ASSOCIATED_GROUPS_KEY,
        JSON.stringify(nextAssociations),
      )
      setAssociatedGroupIds(nextAssociations)
    }
  }, [data?.groups])

  useEffect(() => {
    const nextActiveGroupIds = groups
      .map((group) => group.id)
      .filter((groupId) => {
        const activeUser = localStorage.getItem(`${groupId}-activeUser`)
        return !!activeUser && activeUser !== 'None'
      })

    setActiveGroupIds(nextActiveGroupIds)
  }, [groups])

  if (isLoading || !data) {
    return (
      <GroupsPage reload={refreshGroupsFromStorage}>
        <GroupListLoading />
      </GroupsPage>
    )
  }

  if (data.groups.length === 0) {
    return (
      <GroupsPage reload={refreshGroupsFromStorage}>
        <div className="rounded-lg border border-dashed bg-card px-4 py-8 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Plus className="h-5 w-5" />
          </div>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            {t('NoRecent.description')}
          </p>
          <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <Button asChild>
              <Link href={`/groups/create`}>
                <Plus className="w-4 h-4 mr-1.5" />
                {t('NoRecent.create')}
              </Link>
            </Button>
            <AddGroupByUrlButton reload={refreshGroupsFromStorage} />
          </div>
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
      {starredGroupInfo.length > 0 && (
        <>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
            {t('starred')}
          </h2>
          <GroupList
            groups={starredGroupInfo}
            groupDetails={data.groups}
            archivedGroups={archivedGroups}
            starredGroups={starredGroups}
            refreshGroupsFromStorage={refreshGroupsFromStorage}
            isLoggedIn={isLoggedIn}
            associatedGroupIds={associatedGroupIds}
            activeGroupIds={activeGroupIds}
          />
        </>
      )}

      {groupInfo.length > 0 && (
        <>
          <h2 className="mt-6 mb-2 text-sm font-semibold text-muted-foreground">
            {t('recent')}
          </h2>
          <GroupList
            groups={groupInfo}
            groupDetails={data.groups}
            archivedGroups={archivedGroups}
            starredGroups={starredGroups}
            refreshGroupsFromStorage={refreshGroupsFromStorage}
            isLoggedIn={isLoggedIn}
            associatedGroupIds={associatedGroupIds}
            activeGroupIds={activeGroupIds}
          />
        </>
      )}

      {!hideArchivedGroups && archivedGroupInfo.length > 0 && (
        <>
          <h2 className="mt-6 mb-2 text-sm font-semibold text-muted-foreground opacity-70">
            {t('archived')}
          </h2>
          <div className="opacity-50">
            <GroupList
              groups={archivedGroupInfo}
              groupDetails={data.groups}
              archivedGroups={archivedGroups}
              starredGroups={starredGroups}
              refreshGroupsFromStorage={refreshGroupsFromStorage}
              isLoggedIn={isLoggedIn}
              associatedGroupIds={associatedGroupIds}
              activeGroupIds={activeGroupIds}
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
  isLoggedIn,
  associatedGroupIds,
  activeGroupIds,
}: {
  groups: RecentGroups
  groupDetails?: AppRouterOutput['groups']['list']['groups']
  starredGroups: string[]
  archivedGroups: string[]
  refreshGroupsFromStorage: () => void
  isLoggedIn: boolean
  associatedGroupIds: string[]
  activeGroupIds: string[]
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
          isLoggedIn={isLoggedIn}
          associatedGroupIds={associatedGroupIds}
          activeGroupIds={activeGroupIds}
        />
      ))}
    </ul>
  )
}

function GroupListLoading() {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {Array(4)
        .fill(undefined)
        .map((_, index) => (
          <li key={index} className="rounded-lg border bg-card p-4">
            <div className="flex items-start gap-3 pr-16">
              <Skeleton className="h-10 w-10 rounded-md" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <div className="flex gap-3">
                  <Skeleton className="h-4 w-10 rounded-full" />
                  <Skeleton className="h-4 w-24 rounded-full" />
                </div>
              </div>
            </div>
          </li>
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
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-bold text-2xl">{t('myGroups')}</h1>
        <div className="flex gap-2 shrink-0">
          <AddGroupByUrlButton reload={reload} />
          <Button asChild size="sm">
            <Link href="/groups/create">
              <Plus className="w-4 h-4 mr-1.5" />
              {t('create')}
            </Link>
          </Button>
        </div>
      </div>
      <div>{children}</div>
    </>
  )
}
