import { updateComment } from '@/lib/api'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

export const updateExpenseCommentProcedure = baseProcedure
  .input(
    z.object({
      commentId: z.string().min(1),
      text: z.string(),
    }),
  )
  .mutation(async ({ input: { commentId, text } }) => {
    const comment = await updateComment(commentId, text)
    return { commentId: comment.id }
  })
