import { getGroupExpenses } from '@/lib/api'
import { filterExpensesByDateRange, getExpensesByMonth } from '@/lib/totals'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

/**
 * Lists the expenses that make up a single month's spending on the stats page.
 * Loaded on demand when a bar in the "spending over time" card is clicked, so
 * the overview payload stays lean. The date range is applied first so that a
 * partial month (e.g. the current month under a "last 30 days" range) drills
 * down into exactly the expenses that contributed to the bar.
 */
export const getStatsMonthExpensesProcedure = baseProcedure
  .input(
    z.object({
      groupId: z.string().min(1),
      month: z.string().regex(/^\d{4}-\d{2}$/),
      from: z.string().optional(),
      to: z.string().optional(),
    }),
  )
  .query(async ({ input: { groupId, month, from, to } }) => {
    const allExpenses = await getGroupExpenses(groupId)
    const expenses = filterExpensesByDateRange(allExpenses, from, to)

    return {
      expenses: getExpensesByMonth(expenses, month).map((expense) => ({
        id: expense.id,
        title: expense.title,
        amount: expense.amount,
        expenseDate: expense.expenseDate,
      })),
    }
  })
