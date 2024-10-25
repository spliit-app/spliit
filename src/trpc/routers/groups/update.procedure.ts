import { z } from 'zod'
import { updateGroup } from '../../../lib/api'
import { groupFormSchema } from '../../../lib/schemas'
import { baseProcedure } from '../../init'

export const updateGroupProcedure = baseProcedure
  .input(
    z.object({
      groupId: z.string().min(1),
      groupFormValues: groupFormSchema,
      participantId: z.string().optional(),
    }),
  )
  .mutation(async ({ input: { groupId, groupFormValues, participantId } }) => {
    await updateGroup(groupId, groupFormValues, participantId)
  })
