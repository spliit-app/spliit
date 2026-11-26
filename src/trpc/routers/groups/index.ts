import { createTRPCRouter } from '@/trpc/init'
import { activitiesRouter } from '@/trpc/routers/groups/activities'
import { groupBalancesRouter } from '@/trpc/routers/groups/balances'
import { createGroupProcedure } from '@/trpc/routers/groups/create.procedure'
import { deleteGroupProcedure } from '@/trpc/routers/groups/delete.procedure'
import { groupExpensesRouter } from '@/trpc/routers/groups/expenses'
import { getGroupProcedure } from '@/trpc/routers/groups/get.procedure'
import { groupMembersRouter } from '@/trpc/routers/groups/members'
import { groupPaymentDuesRouter } from '@/trpc/routers/groups/payment-dues'
import { restoreGroupProcedure } from '@/trpc/routers/groups/restore.procedure'
import { groupStatsRouter } from '@/trpc/routers/groups/stats'
import { updateGroupProcedure } from '@/trpc/routers/groups/update.procedure'
import { getGroupDetailsProcedure } from './getDetails.procedure'
import { listGroupsProcedure } from './list.procedure'
import { listMyGroupsProcedure } from './mine.procedure'

export const groupsRouter = createTRPCRouter({
  expenses: groupExpensesRouter,
  balances: groupBalancesRouter,
  paymentDues: groupPaymentDuesRouter,
  stats: groupStatsRouter,
  activities: activitiesRouter,
  members: groupMembersRouter,

  get: getGroupProcedure,
  getDetails: getGroupDetailsProcedure,
  list: listGroupsProcedure,
  mine: listMyGroupsProcedure,
  create: createGroupProcedure,
  update: updateGroupProcedure,
  delete: deleteGroupProcedure,
  restore: restoreGroupProcedure,
})
