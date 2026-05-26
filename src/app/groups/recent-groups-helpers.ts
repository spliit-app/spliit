import { z } from 'zod'

export const recentGroupsSchema = z.array(
  z.object({
    id: z.string().min(1),
    name: z.string(),
  }),
)

export const starredGroupsSchema = z.array(z.string())
export const archivedGroupsSchema = z.array(z.string())

export type RecentGroups = z.infer<typeof recentGroupsSchema>
export type RecentGroup = RecentGroups[number]

const STORAGE_KEY = 'recentGroups'
const STARRED_GROUPS_STORAGE_KEY = 'starredGroups'
const ARCHIVED_GROUPS_STORAGE_KEY = 'archivedGroups'
export const STARTUP_REDIRECT_KEY = 'startupRedirectToRecentGroup'

export function getStartupRedirectEnabled(): boolean {
  const value = localStorage.getItem(STARTUP_REDIRECT_KEY)
  // Default is true (redirect to most recent group)
  return value === null ? true : value === 'true'
}

export function setStartupRedirectEnabled(enabled: boolean): void {
  localStorage.setItem(STARTUP_REDIRECT_KEY, String(enabled))
}

export function getRecentGroups() {
  const groupsInStorageJson = localStorage.getItem(STORAGE_KEY)
  const groupsInStorageRaw = groupsInStorageJson
    ? JSON.parse(groupsInStorageJson)
    : []
  const parseResult = recentGroupsSchema.safeParse(groupsInStorageRaw)
  return parseResult.success ? parseResult.data : []
}

export function saveRecentGroup(group: RecentGroup) {
  const recentGroups = getRecentGroups()
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([group, ...recentGroups.filter((rg) => rg.id !== group.id)]),
  )
}

export function setRecentGroups(groups: RecentGroups) {
  const parseResult = recentGroupsSchema.safeParse(groups)
  if (!parseResult.success) {
    // Invalid data; do not overwrite existing localStorage value
    console.error(
      'Invalid groups data provided to setRecentGroups',
      parseResult.error,
    )
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(parseResult.data))
}

export function deleteRecentGroup(group: RecentGroup) {
  const recentGroups = getRecentGroups()
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(recentGroups.filter((rg) => rg.id !== group.id)),
  )
}

export function deleteGroupFromLocalLists(groupId: string) {
  const recentGroups = getRecentGroups()
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(recentGroups.filter((rg) => rg.id !== groupId)),
  )
  unstarGroup(groupId)
  unarchiveGroup(groupId)
}

export function getStarredGroups() {
  const starredGroupsJson = localStorage.getItem(STARRED_GROUPS_STORAGE_KEY)
  const starredGroupsRaw = starredGroupsJson
    ? JSON.parse(starredGroupsJson)
    : []
  const parseResult = starredGroupsSchema.safeParse(starredGroupsRaw)
  return parseResult.success ? parseResult.data : []
}

export function starGroup(groupId: string) {
  const starredGroups = getStarredGroups()
  localStorage.setItem(
    STARRED_GROUPS_STORAGE_KEY,
    JSON.stringify([...starredGroups, groupId]),
  )
}

export function unstarGroup(groupId: string) {
  const starredGroups = getStarredGroups()
  localStorage.setItem(
    STARRED_GROUPS_STORAGE_KEY,
    JSON.stringify(starredGroups.filter((g) => g !== groupId)),
  )
}

export function getArchivedGroups() {
  const archivedGroupsJson = localStorage.getItem(ARCHIVED_GROUPS_STORAGE_KEY)
  const archivedGroupsRaw = archivedGroupsJson
    ? JSON.parse(archivedGroupsJson)
    : []
  const parseResult = archivedGroupsSchema.safeParse(archivedGroupsRaw)
  return parseResult.success ? parseResult.data : []
}

export function archiveGroup(groupId: string) {
  const archivedGroups = getArchivedGroups()
  localStorage.setItem(
    ARCHIVED_GROUPS_STORAGE_KEY,
    JSON.stringify([...archivedGroups, groupId]),
  )
}

export function unarchiveGroup(groupId: string) {
  const archivedGroups = getArchivedGroups()
  localStorage.setItem(
    ARCHIVED_GROUPS_STORAGE_KEY,
    JSON.stringify(archivedGroups.filter((g) => g !== groupId)),
  )
}
