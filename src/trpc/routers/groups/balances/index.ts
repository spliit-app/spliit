import { createTRPCRouter } from '@/trpc/init'
import { forUserBalancesProcedure } from '@/trpc/routers/groups/balances/forUser.procedure'
import { listGroupBalancesProcedure } from '@/trpc/routers/groups/balances/list.procedure'

export const groupBalancesRouter = createTRPCRouter({
  list: listGroupBalancesProcedure,
  forUser: forUserBalancesProcedure,
})
