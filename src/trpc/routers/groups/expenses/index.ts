import { createTRPCRouter } from '@/trpc/init'
import { createGroupExpenseProcedure } from '@/trpc/routers/groups/expenses/create.procedure'
import { deleteGroupExpenseProcedure } from '@/trpc/routers/groups/expenses/delete.procedure'
import { getGroupExpenseProcedure } from '@/trpc/routers/groups/expenses/get.procedure'
import { listGroupExpensesProcedure } from '@/trpc/routers/groups/expenses/list.procedure'
import { updateGroupExpenseProcedure } from '@/trpc/routers/groups/expenses/update.procedure'

export const groupExpensesRouter = createTRPCRouter({
  list: listGroupExpensesProcedure,
  get: getGroupExpenseProcedure,
  create: createGroupExpenseProcedure,
  update: updateGroupExpenseProcedure,
  delete: deleteGroupExpenseProcedure,
})
