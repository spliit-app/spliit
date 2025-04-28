import { createTRPCRouter } from '@/trpc/init'
import { listGroupActivitiesProcedure } from '@/trpc/routers/groups/activities/list.procedure'

export const activitiesRouter = createTRPCRouter({
  list: listGroupActivitiesProcedure,
})
