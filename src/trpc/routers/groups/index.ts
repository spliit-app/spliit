import { createTRPCRouter } from '@/trpc/init'
import { activitiesRouter } from '@/trpc/routers/groups/activities'
import { groupBalancesRouter } from '@/trpc/routers/groups/balances'
import { createGroupProcedure } from '@/trpc/routers/groups/create.procedure'
import { groupExpensesRouter } from '@/trpc/routers/groups/expenses'
import { getGroupProcedure } from '@/trpc/routers/groups/get.procedure'
import { groupStatsRouter } from '@/trpc/routers/groups/stats'
import { updateGroupProcedure } from '@/trpc/routers/groups/update.procedure'
import { getGroupDetailsProcedure } from './getDetails.procedure'
import {
  cancelCreateImportFromFileProcedure,
  finalizeCreateImportFromFileProcedure,
  importGroupFromFileProcedure,
  previewImportGroupFromFileProcedure,
  runCreateImportFromFileChunkProcedure,
  startCreateImportFromFileProcedure,
} from './import'
import { listGroupsProcedure } from './list.procedure'

export const groupsRouter = createTRPCRouter({
  expenses: groupExpensesRouter,
  balances: groupBalancesRouter,
  stats: groupStatsRouter,
  activities: activitiesRouter,

  get: getGroupProcedure,
  getDetails: getGroupDetailsProcedure,
  list: listGroupsProcedure,
  create: createGroupProcedure,
  importFromFile: importGroupFromFileProcedure,
  importFromFilePreview: previewImportGroupFromFileProcedure,
  importFromFileStartJob: startCreateImportFromFileProcedure,
  importFromFileRunChunk: runCreateImportFromFileChunkProcedure,
  importFromFileCancelJob: cancelCreateImportFromFileProcedure,
  importFromFileFinalize: finalizeCreateImportFromFileProcedure,
  update: updateGroupProcedure,
})
