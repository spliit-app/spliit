import { getGroups } from '@/lib/api'
import { MAX_GROUPS_PER_QUERY } from '@/lib/group-query-limits'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

export const listGroupsProcedure = baseProcedure
  .input(
    z.object({
      groupIds: z.array(z.string().min(1).max(64)).max(MAX_GROUPS_PER_QUERY),
    }),
  )
  .query(async ({ input: { groupIds } }) => {
    const groups = await getGroups(groupIds)
    return { groups }
  })
