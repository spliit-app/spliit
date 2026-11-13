import { Prisma } from '@/generated/prisma/client'
import { ParticipantsHaveExpensesError, updateGroup } from '@/lib/api'
import { groupFormSchema } from '@/lib/schemas'
import { baseProcedure } from '@/trpc/init'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

// From the migration that stopped participant removal from deleting expenses.
const PARTICIPANT_EXPENSE_CONSTRAINTS = [
  'Expense_paidById_fkey',
  'ExpensePaidFor_participantId_fkey',
]

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
      if (error instanceof ParticipantsHaveExpensesError) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: error.message,
          cause: error,
        })
      }
      // An expense added between updateGroup's check and its commit: the
      // foreign keys refuse it, but we don't know the names.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003' &&
        PARTICIPANT_EXPENSE_CONSTRAINTS.includes(
          (error.meta as any)?.driverAdapterError?.cause?.constraint?.index,
        )
      ) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A removed participant is part of expenses.',
        })
      }
      throw error
    }
  })
