import { createTRPCRouter } from '@/trpc/init'
import { activitiesRouter } from '@/trpc/routers/groups/activities'
import { groupBalancesRouter } from '@/trpc/routers/groups/balances'
import { createGroupProcedure } from '@/trpc/routers/groups/create.procedure'
import { deleteGroupProcedure } from '@/trpc/routers/groups/delete.procedure'
import { groupExpensesRouter } from '@/trpc/routers/groups/expenses'
import { getGroupProcedure } from '@/trpc/routers/groups/get.procedure'
import { restoreGroupProcedure } from '@/trpc/routers/groups/restore.procedure'
import { groupStatsRouter } from '@/trpc/routers/groups/stats'
import {
  deleteGroupTagProcedure,
  listGroupTagsProcedure,
} from '@/trpc/routers/groups/tags.procedure'
import { updateGroupProcedure } from '@/trpc/routers/groups/update.procedure'
import { getGroupDetailsProcedure } from './getDetails.procedure'
import { listGroupsProcedure } from './list.procedure'

export const groupsRouter = createTRPCRouter({
  expenses: groupExpensesRouter,
  balances: groupBalancesRouter,
  stats: groupStatsRouter,
  activities: activitiesRouter,
  tags: listGroupTagsProcedure,
  deleteTag: deleteGroupTagProcedure,

  get: getGroupProcedure,
  getDetails: getGroupDetailsProcedure,
  list: listGroupsProcedure,
  create: createGroupProcedure,
  update: updateGroupProcedure,
  delete: deleteGroupProcedure,
  restore: restoreGroupProcedure,
})
