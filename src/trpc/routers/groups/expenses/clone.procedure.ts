import { cloneExpense } from '@/lib/api'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

export const cloneExpenseProcedure = baseProcedure
  .input(
    z.object({
      groupId: z.string().min(1),
      expenseId: z.string().min(1),
      participantId: z.string().optional(),
    }),
  )
  .mutation(async ({ input: { groupId, expenseId, participantId } }) => {
    await cloneExpense(groupId, expenseId, participantId)
    return {}
  })
