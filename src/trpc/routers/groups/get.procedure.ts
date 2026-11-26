import { getGroup } from '@/lib/api'
import { groupProcedure } from '@/trpc/init'
import { z } from 'zod'

/**
 * The group shell: header, tabs and the "who am I here" answer.
 *
 * `role` and `participantId` are resolved from the membership, so the UI can hide
 * owner-only controls and pre-select the right person in the expense form without
 * asking the browser who the user is.
 */
export const getGroupProcedure = groupProcedure(
  z.object({ groupId: z.string().min(1) }),
).query(async ({ ctx, input: { groupId } }) => {
  const group = await getGroup(groupId)
  return {
    group,
    role: ctx.group.membership.role,
    participantId: ctx.group.participantId,
  }
})
