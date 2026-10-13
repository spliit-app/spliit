import { scheduleGroupDeletion } from '@/lib/api'
import { getRuntimeFeatureFlags } from '@/lib/featureFlags'
import { baseProcedure } from '@/trpc/init'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

export const deleteGroupProcedure = baseProcedure
  .input(
    z.object({
      groupId: z.string().min(1),
      groupName: z.string().min(1),
      participantId: z.string().optional(),
    }),
  )
  .mutation(async ({ input: { groupId, groupName, participantId } }) => {
    // Restoring stays available while the feature is disabled, so that groups
    // scheduled before it was turned off can still be saved.
    const { enableGroupDeletion } = await getRuntimeFeatureFlags()
    if (!enableGroupDeletion) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Group deletion is not enabled on this instance.',
      })
    }
    await scheduleGroupDeletion(groupId, groupName, participantId)
  })
