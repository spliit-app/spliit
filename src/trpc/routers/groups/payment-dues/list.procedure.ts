import { listGroupPaymentDues } from '@/lib/payment-dues'
import { groupProcedure } from '@/trpc/init'
import { z } from 'zod'

export const listGroupPaymentDuesProcedure = groupProcedure(
  z.object({ groupId: z.string().min(1) }),
).query(async ({ input: { groupId } }) => {
  return listGroupPaymentDues(groupId)
})
