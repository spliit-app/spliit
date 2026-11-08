import { getRecurringExpenseSeries } from '@/lib/api'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

export const listRecurringExpenseSeriesProcedure = baseProcedure
  .input(z.object({ groupId: z.string().min(1) }))
  .query(async ({ input: { groupId } }) => {
    const series = await getRecurringExpenseSeries(groupId)
    return { series }
  })
