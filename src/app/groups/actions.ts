'use server'
import { getGroups } from '@/lib/api'

export async function getGroupsAction(groupIds: string[]) {
  'use server'
  return getGroups(groupIds)
}
