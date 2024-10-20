import { deleteComment } from '@/lib/api'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

export const deleteExpenseCommentProcedure = baseProcedure
  .input(
    z.object({
      commentId: z.string().min(1),
    }),
  )
  .mutation(async ({ input: { commentId } }) => {
    await deleteComment(commentId)
    return {}
  })
