import { getGroupsForUser } from '@/lib/api'
import { protectedProcedure } from '@/trpc/init'

/**
 * The signed-in user's groups, resolved server-side.
 *
 * The client still stores starred/archived flags and a recency hint in
 * `localStorage`, but *which groups exist for this person* is now an account
 * fact rather than a browser one.
 */
export const listMyGroupsProcedure = protectedProcedure.query(
  async ({ ctx }) => {
    const groups = await getGroupsForUser(ctx.user.id)
    return { groups }
  },
)
