'use server'

import { getGroupExpenses } from '@/lib/api'

export async function getGroupExpensesAction(
  groupId: string,
  options?: { offset: number; length: number },
) {
  'use server'

  try {
    return getGroupExpenses(groupId, options)
  } catch {
    return null
  }
}
