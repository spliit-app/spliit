import { getGroups } from '@/lib/api'
import { MAX_GROUPS_PER_QUERY } from '@/lib/group-query-limits'
import { protectedProcedure } from '@/trpc/init'
import { z } from 'zod'

/**
 * Hydrates a list of groups the client remembers (recency, starred, archived).
 *
 * The ids come from `localStorage`, so they are not trusted: `getGroups` keeps
 * only the ones the caller is a member of. Anything else is silently dropped
 * rather than refused, because a stale hint is not an attack.
 */
export const listGroupsProcedure = protectedProcedure
  .input(
    z.object({
      groupIds: z.array(z.string().min(1).max(64)).max(MAX_GROUPS_PER_QUERY),
    }),
  )
  .query(async ({ ctx, input: { groupIds } }) => {
    const groups = await getGroups(groupIds, ctx.user.id)
    return { groups }
  })
