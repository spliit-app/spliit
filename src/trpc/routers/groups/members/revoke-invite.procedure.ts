import { revokeInvite } from '@/lib/invites'
import { groupOwnerProcedure } from '@/trpc/init'
import { z } from 'zod'

export const revokeInviteProcedure = groupOwnerProcedure(
  z.object({
    groupId: z.string().min(1),
    inviteId: z.string().min(1),
  }),
).mutation(async ({ input }) => {
  await revokeInvite(input)
  return {}
})
