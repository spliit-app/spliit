import { settlePaymentDue } from '@/lib/payment-dues'
import { actingParticipantId, groupProcedure } from '@/trpc/init'
import { z } from 'zod'

export const settlePaymentDueProcedure = groupProcedure(
  z.object({
    groupId: z.string().min(1),
    paymentDueId: z.string().min(1),
    // Stored as the reimbursement expense title, so the caller passes the
    // translated label ("Reimbursement") rather than the server guessing a
    // locale.
    title: z.string().min(1).max(200),
  }),
).mutation(async ({ ctx, input }) => {
  return settlePaymentDue({
    ...input,
    participantId: actingParticipantId(ctx),
  })
})
