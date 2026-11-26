import { getActivities } from '@/lib/api'
import { groupProcedure } from '@/trpc/init'
import { z } from 'zod'

export const listGroupActivitiesProcedure = groupProcedure(
  z.object({
    groupId: z.string().min(1).max(64),
    cursor: z.number().int().min(0).optional().default(0),
    limit: z.number().int().min(1).max(100).optional().default(5),
  }),
).query(async ({ input: { groupId, cursor, limit } }) => {
  const activities = await getActivities(groupId, {
    offset: cursor,
    length: limit + 1,
  })
  return {
    activities: activities.slice(0, limit),
    hasMore: !!activities[limit],
    nextCursor: cursor + limit,
  }
})
