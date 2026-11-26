import { createInvite } from '@/lib/invites'
import { groupOwnerProcedure } from '@/trpc/init'
import { z } from 'zod'

export const inviteMemberProcedure = groupOwnerProcedure(
  z.object({
    groupId: z.string().min(1),
    email: z.string().trim().toLowerCase().email().max(100),
    role: z.enum(['OWNER', 'MEMBER']).default('MEMBER'),
  }),
).mutation(async ({ ctx, input: { groupId, email, role } }) => {
  const invite = await createInvite({
    groupId,
    email,
    role,
    createdByUserId: ctx.user.id,
  })
  return { inviteId: invite.id, token: invite.token }
})
