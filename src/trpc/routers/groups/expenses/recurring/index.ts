import { createTRPCRouter } from '@/trpc/init'
import { getRecurringExpenseSeriesProcedure } from '@/trpc/routers/groups/expenses/recurring/get.procedure'
import { listRecurringExpenseSeriesProcedure } from '@/trpc/routers/groups/expenses/recurring/list.procedure'
import { stopRecurringExpenseProcedure } from '@/trpc/routers/groups/expenses/recurring/stop.procedure'

export const groupExpensesRecurringRouter = createTRPCRouter({
  list: listRecurringExpenseSeriesProcedure,
  get: getRecurringExpenseSeriesProcedure,
  stop: stopRecurringExpenseProcedure,
})
