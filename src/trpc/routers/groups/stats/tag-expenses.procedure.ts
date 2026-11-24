import { getGroupExpenses } from '@/lib/api'
import { getExpensesByTag } from '@/lib/tags'
import { filterExpensesByDateRange } from '@/lib/totals'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

export const getStatsTagExpensesProcedure = baseProcedure
  .input(
    z.object({
      groupId: z.string().min(1).max(64),
      tagId: z.string().min(1).max(64).nullable(),
      from: z.string().optional(),
      to: z.string().optional(),
    }),
  )
  .query(async ({ input: { groupId, tagId, from, to } }) => {
    const expenses = filterExpensesByDateRange(
      await getGroupExpenses(groupId, { includeTags: true }),
      from,
      to,
    )
    return {
      expenses: getExpensesByTag(expenses, tagId).map((expense) => ({
        id: expense.id,
        title: expense.title,
        amount: expense.amount,
        expenseDate: expense.expenseDate,
      })),
    }
  })
