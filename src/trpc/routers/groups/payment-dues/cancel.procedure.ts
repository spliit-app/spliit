import { cancelPaymentDue } from '@/lib/payment-dues'
import { groupProcedure } from '@/trpc/init'
import { z } from 'zod'

export const cancelPaymentDueProcedure = groupProcedure(
  z.object({
    groupId: z.string().min(1),
    paymentDueId: z.string().min(1),
  }),
).mutation(async ({ input }) => {
  return cancelPaymentDue(input)
})
