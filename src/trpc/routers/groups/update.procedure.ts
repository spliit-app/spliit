import { updateGroup } from '@/lib/api'
import { assertGroupUnlocked } from '@/lib/group-access'
import { groupFormSchema } from '@/lib/schemas'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

export const updateGroupProcedure = baseProcedure
  .input(
    z.object({
      groupId: z.string().min(1),
      groupFormValues: groupFormSchema,
      participantId: z.string().optional(),
    }),
  )
  .mutation(async ({ input: { groupId, groupFormValues, participantId } }) => {
    await assertGroupUnlocked(groupId)
    await updateGroup(groupId, groupFormValues, participantId)
  })
