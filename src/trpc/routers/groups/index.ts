import { createTRPCRouter } from '@/trpc/init'
import { groupBalancesRouter } from '@/trpc/routers/groups/balances'
import { groupExpensesRouter } from '@/trpc/routers/groups/expenses'
import { groupInformationRouter } from '@/trpc/routers/groups/information'

export const groupsRouter = createTRPCRouter({
  expenses: groupExpensesRouter,
  balances: groupBalancesRouter,
  information: groupInformationRouter,
})
