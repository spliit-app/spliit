import { deleteExpense } from '@/lib/api'
import { assertGroupUnlocked } from '@/lib/group-access'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

export const deleteGroupExpenseProcedure = baseProcedure
  .input(
    z.object({
      expenseId: z.string().min(1),
      groupId: z.string().min(1),
      participantId: z.string().optional(),
    }),
  )
  .mutation(async ({ input: { expenseId, groupId, participantId } }) => {
    await assertGroupUnlocked(groupId)
    await deleteExpense(groupId, expenseId, participantId)
    return {}
  })
