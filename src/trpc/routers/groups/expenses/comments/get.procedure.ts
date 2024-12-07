import { getComment } from '@/lib/api'
import { baseProcedure } from '@/trpc/init'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

export const getExpenseCommentProcedure = baseProcedure
  .input(z.object({ commentId: z.string().min(1) }))
  .query(async ({ input: { commentId } }) => {
    const comments = await getComment(commentId)
    if (!comments) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Comment not found',
      })
    }
    return { comments }
  })
