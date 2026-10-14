import { getGroupExpenses } from '@/lib/api'
import { filterExpensesByDateRange, getExpensesByCategory } from '@/lib/totals'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

/**
 * Lists the expenses that make up a single category's spending on the stats
 * page. Loaded on demand when a category in the "by category" card is clicked,
 * so the overview payload stays lean. The date range is applied first so the
 * drill-down matches the range currently selected on the page.
 */
export const getStatsCategoryExpensesProcedure = baseProcedure
  .input(
    z.object({
      groupId: z.string().min(1),
      categoryId: z.number().int(),
      from: z.string().optional(),
      to: z.string().optional(),
    }),
  )
  .query(async ({ input: { groupId, categoryId, from, to } }) => {
    const allExpenses = await getGroupExpenses(groupId)
    const expenses = filterExpensesByDateRange(allExpenses, from, to)

    return {
      expenses: getExpensesByCategory(expenses, categoryId).map((expense) => ({
        id: expense.id,
        title: expense.title,
        amount: expense.amount,
        expenseDate: expense.expenseDate,
      })),
    }
  })
