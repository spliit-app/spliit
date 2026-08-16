import { createTRPCRouter } from '@/trpc/init'
import { getStatsOverviewProcedure } from '@/trpc/routers/groups/stats/overview.procedure'

export const groupStatsRouter = createTRPCRouter({
  overview: getStatsOverviewProcedure,
})
