import { createExpense, EXPENSE_ID_EXISTS } from '@/lib/api'
import { expenseFormSchema } from '@/lib/schemas'
import { baseProcedure } from '@/trpc/init'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

export const createGroupExpenseProcedure = baseProcedure
  .input(
    z.object({
      groupId: z.string().min(1),
      expenseFormValues: expenseFormSchema,
      participantId: z.string().optional(),
      // Minted by the form with `randomId()` (a 21-character nanoid) so the
      // split it previews is the one the saved expense gets. Optional so
      // other callers keep getting a server-minted id.
      expenseId: z
        .string()
        .regex(/^[A-Za-z0-9_-]{21}$/)
        .optional(),
    }),
  )
  .mutation(
    async ({
      input: { groupId, expenseFormValues, participantId, expenseId },
    }) => {
      try {
        const expense = await createExpense(
          expenseFormValues,
          groupId,
          participantId,
          expenseId,
        )
        return { expenseId: expense.id }
      } catch (error) {
        // A replayed offline expense: the client reads this as "saved".
        if (error instanceof Error && error.message === EXPENSE_ID_EXISTS)
          throw new TRPCError({ code: 'CONFLICT', message: EXPENSE_ID_EXISTS })
        throw error
      }
    },
  )
