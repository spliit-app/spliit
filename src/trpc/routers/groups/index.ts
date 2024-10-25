import { createTRPCRouter } from '../../init'
import { activitiesRouter } from './activities'
import { groupBalancesRouter } from './balances'
import { createGroupProcedure } from './create.procedure'
import { groupExpensesRouter } from './expenses'
import { getGroupProcedure } from './get.procedure'
import { getGroupDetailsProcedure } from './getDetails.procedure'
import { listGroupsProcedure } from './list.procedure'
import { groupStatsRouter } from './stats'
import { updateGroupProcedure } from './update.procedure'

export const groupsRouter = createTRPCRouter({
  expenses: groupExpensesRouter,
  balances: groupBalancesRouter,
  stats: groupStatsRouter,
  activities: activitiesRouter,

  get: getGroupProcedure,
  getDetails: getGroupDetailsProcedure,
  list: listGroupsProcedure,
  create: createGroupProcedure,
  update: updateGroupProcedure,
})
