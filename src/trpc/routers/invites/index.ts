import { acceptInvite, getInvite } from '@/lib/invites'
import { createTRPCRouter, protectedProcedure } from '@/trpc/init'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

/**
 * The invitee's side of an invitation.
 *
 * These sit outside `groupProcedure` on purpose: the whole point is that the
 * caller is not a member of the group yet, so the group's membership check cannot
 * be the gate. The gate is the token *plus* the address it was sent to.
 */
export const invitesRouter = createTRPCRouter({
  preview: protectedProcedure
    .input(z.object({ token: z.string().min(1).max(64) }))
    .query(async ({ ctx, input: { token } }) => {
      const invite = await getInvite(token, ctx.user.id)
      if (!invite) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invitation not found.',
        })
      }
      return { invite }
    }),

  accept: protectedProcedure
    .input(z.object({ token: z.string().min(1).max(64) }))
    .mutation(async ({ ctx, input: { token } }) => {
      return acceptInvite({ token, userId: ctx.user.id })
    }),
})
