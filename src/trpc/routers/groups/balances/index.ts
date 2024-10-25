import { createTRPCRouter } from '../../../init'
import { listGroupBalancesProcedure } from './list.procedure'

export const groupBalancesRouter = createTRPCRouter({
  list: listGroupBalancesProcedure,
})
