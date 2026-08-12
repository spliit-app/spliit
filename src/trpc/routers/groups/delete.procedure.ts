import { z } from 'zod'
import { scheduleDeleteGroup } from '@/lib/api'
import { baseProcedure } from '@/trpc/init'

export const deleteGroupProcedure = baseProcedure
  .input(
    z.object({
      groupId: z.string().min(1),
      groupName: z.string().min(1),
      participantId: z.string().optional(),
    }),
  )
  .mutation(async ({ input: { groupId, groupName, participantId } }) => {
    await scheduleDeleteGroup(groupId,groupName, participantId)
  })
