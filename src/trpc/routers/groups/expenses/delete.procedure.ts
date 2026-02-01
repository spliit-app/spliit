import { deleteExpenseS3Documents } from '@/app/groups/delete-group-actions'
import { deleteExpense } from '@/lib/api'
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
    // Delete S3 documents for this expense (server action handles env safely)
    await deleteExpenseS3Documents(expenseId)

    // Delete the expense from database (also deletes document records via cascade)
    await deleteExpense(groupId, expenseId, participantId)
    return {}
  })
