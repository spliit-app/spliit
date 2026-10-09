import { Prisma } from '@/generated/prisma/client'
import { updateGroup } from '@/lib/api'
import { groupFormSchema } from '@/lib/schemas'
import { baseProcedure } from '@/trpc/init'
import { TRPCError } from '@trpc/server'
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
    try {
      await updateGroup(groupId, groupFormValues, participantId)
    } catch (error) {
      // The database refuses to delete a participant who is still part of an
      // expense. The form hides the remove button for them, but only for the
      // expenses it knew of when it loaded.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A removed participant is part of expenses.',
        })
      }
      throw error
    }
  })
