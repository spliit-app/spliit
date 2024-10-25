import { z } from 'zod'
import { getActivities } from '../../../../lib/api'
import { baseProcedure } from '../../../init'

export const listGroupActivitiesProcedure = baseProcedure
  .input(
    z.object({
      groupId: z.string(),
      cursor: z.number().optional().default(0),
      limit: z.number().optional().default(5),
    }),
  )
  .query(async ({ input: { groupId, cursor, limit } }) => {
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
