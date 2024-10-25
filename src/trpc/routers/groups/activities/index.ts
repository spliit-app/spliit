import { createTRPCRouter } from '../../../init'
import { listGroupActivitiesProcedure } from './list.procedure'

export const activitiesRouter = createTRPCRouter({
  list: listGroupActivitiesProcedure,
})
