import { deleteExpense } from '@/lib/api'
import { actingParticipantId, groupProcedure } from '@/trpc/init'
import { z } from 'zod'

export const deleteGroupExpenseProcedure = groupProcedure(
  z.object({
    expenseId: z.string().min(1),
    groupId: z.string().min(1),
  }),
).mutation(async ({ ctx, input: { expenseId, groupId } }) => {
  await deleteExpense(groupId, expenseId, actingParticipantId(ctx))
  return {}
})
