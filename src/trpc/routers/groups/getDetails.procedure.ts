import { getGroup, getGroupExpensesParticipants } from '@/lib/api'
import { actingParticipantId, groupProcedure } from '@/trpc/init'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

export const getGroupDetailsProcedure = groupProcedure(
  z.object({ groupId: z.string().min(1) }),
).query(async ({ ctx, input: { groupId } }) => {
  // Membership was already proven by `groupProcedure`, so a missing group here
  // means it was deleted between the check and this read.
  const group = await getGroup(groupId)
  if (!group) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Group not found.' })
  }

  const participantsWithExpenses = await getGroupExpensesParticipants(groupId)
  return {
    group,
    participantsWithExpenses,
    /**
     * Who the caller is in this group, resolved server-side.
     *
     * Replaces the `localStorage` "who are you?" answer as the source of
     * truth: the browser hint is now only a UI convenience.
     */
    me: {
      role: ctx.group.membership.role,
      participantId: actingParticipantId(ctx) ?? null,
    },
  }
})
