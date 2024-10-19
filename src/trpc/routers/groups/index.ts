import { createTRPCRouter } from '@/trpc/init'
import { groupBalancesRouter } from '@/trpc/routers/groups/balances'
import { groupExpensesRouter } from '@/trpc/routers/groups/expenses'
import { getGroupProcedure } from '@/trpc/routers/groups/get.procedure'
import { updateGroupProcedure } from '@/trpc/routers/groups/update.procedure'

export const groupsRouter = createTRPCRouter({
  expenses: groupExpensesRouter,
  balances: groupBalancesRouter,

  get: getGroupProcedure,
  update: updateGroupProcedure,
})
