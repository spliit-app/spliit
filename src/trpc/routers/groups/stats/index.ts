import { createTRPCRouter } from '../../../init'
import { getGroupStatsProcedure } from './get.procedure'

export const groupStatsRouter = createTRPCRouter({
  get: getGroupStatsProcedure,
})
