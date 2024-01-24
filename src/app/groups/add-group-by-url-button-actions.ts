'use server'

import { getGroup } from '@/lib/api'

export async function getGroupInfoAction(groupId: string) {
  'use server'
  return getGroup(groupId)
}
