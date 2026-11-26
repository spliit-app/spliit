import { getGroupExpenses } from '@/lib/api'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const listGroupExpensesProcedure = baseProcedure
  .input(
    z.object({
      groupId: z.string().min(1).max(64),
      cursor: z.number().int().min(0).optional(),
      limit: z.number().int().min(1).max(100).optional(),
      filter: z.string().max(200).optional(),
      sortBy: z.enum(['date', 'amount', 'title', 'createdAt']).optional(),
      sortOrder: z.enum(['asc', 'desc']).optional(),
      dateFrom: dateOnly.optional(),
      dateTo: dateOnly.optional(),
    }),
  )
  .query(
    async ({
      input: {
        groupId,
        cursor = 0,
        limit = 10,
        filter,
        sortBy,
        sortOrder,
        dateFrom,
        dateTo,
      },
    }) => {
      const expenses = await getGroupExpenses(groupId, {
        offset: cursor,
        length: limit + 1,
        filter,
        sortBy,
        sortOrder,
        dateFrom,
        dateTo,
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
    },
  )
