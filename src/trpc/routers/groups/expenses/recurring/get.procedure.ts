import { getRecurringExpenseSeriesDetail } from '@/lib/api'
import { baseProcedure } from '@/trpc/init'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

export const getRecurringExpenseSeriesProcedure = baseProcedure
  .input(z.object({ groupId: z.string().min(1), seriesId: z.string().min(1) }))
  .query(async ({ input: { groupId, seriesId } }) => {
    const series = await getRecurringExpenseSeriesDetail(groupId, seriesId)
    if (series.occurrences.length === 0) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Recurring expense not found',
      })
    }
    return series
  })
