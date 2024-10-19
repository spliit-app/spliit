import { createTRPCRouter } from '@/trpc/init'
import { groupExpensesRouter } from '@/trpc/routers/groups/expenses'

export const groupsRouter = createTRPCRouter({
  expenses: groupExpensesRouter,
})
