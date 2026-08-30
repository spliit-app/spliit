import { getGroupExpenses } from '@/lib/api'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

export const listGroupExpensesProcedure = baseProcedure
  .input(
    z.object({
      groupId: z.string().min(1).max(30),
      cursor: z.number().int().min(0).optional(),
      limit: z.number().int().min(1).max(100).optional(),
      filter: z.string().max(200).optional(),
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
