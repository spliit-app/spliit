import { createTRPCRouter } from '@/trpc/init'
import { groupBalancesRouter } from '@/trpc/routers/groups/balances'
import { groupExpensesRouter } from '@/trpc/routers/groups/expenses'

export const groupsRouter = createTRPCRouter({
  expenses: groupExpensesRouter,
  balances: groupBalancesRouter,
})
