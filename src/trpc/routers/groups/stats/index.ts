import { createTRPCRouter } from '@/trpc/init'
import { getGroupStatsProcedure } from '@/trpc/routers/groups/stats/get.procedure'

export const groupStatsRouter = createTRPCRouter({
  get: getGroupStatsProcedure,
})
