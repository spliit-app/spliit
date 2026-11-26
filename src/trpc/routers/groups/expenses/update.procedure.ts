import { updateExpense } from '@/lib/api'
import { expenseFormSchema } from '@/lib/schemas'
import { actingParticipantId, groupProcedure } from '@/trpc/init'
import { z } from 'zod'

export const updateGroupExpenseProcedure = groupProcedure(
  z.object({
    expenseId: z.string().min(1),
    groupId: z.string().min(1),
    expenseFormValues: expenseFormSchema,
  }),
).mutation(
  async ({ ctx, input: { expenseId, groupId, expenseFormValues } }) => {
    const expense = await updateExpense(
      groupId,
      expenseId,
      expenseFormValues,
      actingParticipantId(ctx),
    )
    return { expenseId: expense.id }
  },
)
