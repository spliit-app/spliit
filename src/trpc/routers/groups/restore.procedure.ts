
import { z } from 'zod'
import { restoreGroup } from '@/lib/api'
import { baseProcedure } from '@/trpc/init'

export const restoreGroupProcedure = baseProcedure
  .input(
    z.object({
      groupId: z.string().min(1),
      participantId: z.string().optional(),
    }),
  )
  .mutation(async ({ input: { groupId } }) => {
    await restoreGroup(groupId)
  })
