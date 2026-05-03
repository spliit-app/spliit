import { createExpense } from '@/lib/api'
import { expenseFormSchema } from '@/lib/schemas'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

export const bulkCreateGroupExpensesProcedure = baseProcedure
  .input(
    z.object({
      groupId: z.string().min(1),
      expensesFormValues: z.array(expenseFormSchema),
      participantId: z.string().optional(),
    }),
  )
  .mutation(
    async ({ input: { groupId, expensesFormValues, participantId } }) => {
      const expenseIds: string[] = []
      for (const expenseFormValues of expensesFormValues) {
        const expense = await createExpense(
          expenseFormValues,
          groupId,
          participantId,
        )
        expenseIds.push(expense.id)
      }
      return { expenseIds }
    },
  )
