import { listInvites } from '@/lib/invites'
import { listGroupMembers } from '@/lib/membership'
import { groupProcedure } from '@/trpc/init'
import { z } from 'zod'

/**
 * Who is in this group, and what accounts have been invited.
 *
 * Invitations are only listed for the owner: a member has no use for a pending
 * token, and listing other people's addresses to everybody would leak them.
 */
export const listGroupMembersProcedure = groupProcedure(
  z.object({ groupId: z.string().min(1) }),
).query(async ({ ctx, input: { groupId } }) => {
  const [members, invites] = await Promise.all([
    listGroupMembers(groupId),
    ctx.group.membership.role === 'OWNER'
      ? listInvites(groupId)
      : Promise.resolve([]),
  ])

  return {
    members: members.filter(({ status }) => status === 'ACTIVE'),
    invites,
    me: {
      userId: ctx.user.id,
      role: ctx.group.membership.role,
      participantId: ctx.group.participantId,
    },
  }
})
