import { createPaymentDue } from '@/lib/payment-dues'
import { actingParticipantId, groupProcedure } from '@/trpc/init'
import { z } from 'zod'

export const createPaymentDueProcedure = groupProcedure(
  z.object({
    groupId: z.string().min(1),
    fromParticipantId: z.string().min(1),
    toParticipantId: z.string().min(1),
    // Minor units: the client converts the displayed amount.
    amount: z.number().int().positive(),
    // Calendar day, `YYYY-MM-DD`.
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
).mutation(async ({ ctx, input }) => {
  return createPaymentDue({
    groupId: input.groupId,
    fromParticipantId: input.fromParticipantId,
    toParticipantId: input.toParticipantId,
    amount: input.amount,
    dueDate: input.dueDate,
    // Attribution is the caller's own participant, never a client value.
    createdByParticipantId: actingParticipantId(ctx),
  })
})
