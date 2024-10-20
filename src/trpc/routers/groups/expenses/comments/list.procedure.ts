import { getComments } from '@/lib/api'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

export const listExpenseCommentsProcedure = baseProcedure
  .input(
    z.object({
      expenseId: z.string().min(1),
      cursor: z.number().optional(),
      limit: z.number().optional(),
    }),
  )
  .query(async ({ input: { expenseId, cursor = 0, limit = 10 } }) => {
    const comments = await getComments(expenseId, {
      offset: cursor,
      length: limit + 1,
    })
    return {
      comments: comments.slice(0, limit).map((comment) => ({
        ...comment,
        time: new Date(comment.time),
      })),
      hasMore: !!comments[limit],
      nextCursor: cursor + limit,
    }
  })
