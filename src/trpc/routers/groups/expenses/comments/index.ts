import { createTRPCRouter } from '@/trpc/init'
import { listExpenseCommentsProcedure } from '@/trpc/routers/groups/expenses/comments/list.procedure'
import { getExpenseCommentProcedure } from '@/trpc/routers/groups/expenses/comments/get.procedure'
import { createExpenseCommentProcedure } from '@/trpc/routers/groups/expenses/comments/create.procedure'
import { updateExpenseCommentProcedure } from '@/trpc/routers/groups/expenses/comments/update.procedure'
import { deleteExpenseCommentProcedure } from '@/trpc/routers/groups/expenses/comments/delete.procedure'

export const expenseCommentRouter = createTRPCRouter({
  list: listExpenseCommentsProcedure,
  get: getExpenseCommentProcedure,
  create: createExpenseCommentProcedure,
  update: updateExpenseCommentProcedure,
  delete: deleteExpenseCommentProcedure,
})
