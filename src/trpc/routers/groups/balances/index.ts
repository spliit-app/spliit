import { createTRPCRouter } from '@/trpc/init'
import { listGroupBalancesProcedure } from '@/trpc/routers/groups/balances/list.procedure'

export const groupBalancesRouter = createTRPCRouter({
  list: listGroupBalancesProcedure,
})
