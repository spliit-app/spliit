import { getGroupExpenses } from '@/lib/api'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

export const listGroupExpensesProcedure = baseProcedure
  .input(
    z.object({
      groupId: z.string().min(1),
      cursor: z.number().optional(),
      limit: z.number().optional(),
      filter: z.string().optional(),
    }),
  )
  .query(async ({ input: { groupId, cursor = 0, limit = 10, filter } }) => {
    const expenses = await getGroupExpenses(groupId, {
      offset: cursor,
      length: limit + 1,
      filter,
    })
    return {
      expenses: expenses.slice(0, limit).map((expense) => ({
        ...expense,
        createdAt: new Date(expense.createdAt),
        expenseDate: new Date(expense.expenseDate),
      })),
      hasMore: !!expenses[limit],
      nextCursor: cursor + limit,
    }
  })
