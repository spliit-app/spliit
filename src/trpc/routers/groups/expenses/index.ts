import { createTRPCRouter } from '@/trpc/init'
import { listGroupExpensesProcedure } from '@/trpc/routers/groups/expenses/list.procedure'

export const groupExpensesRouter = createTRPCRouter({
  list: listGroupExpensesProcedure,
})
