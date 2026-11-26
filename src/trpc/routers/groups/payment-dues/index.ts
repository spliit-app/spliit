import { createTRPCRouter } from '@/trpc/init'
import { cancelPaymentDueProcedure } from '@/trpc/routers/groups/payment-dues/cancel.procedure'
import { createPaymentDueProcedure } from '@/trpc/routers/groups/payment-dues/create.procedure'
import { listGroupPaymentDuesProcedure } from '@/trpc/routers/groups/payment-dues/list.procedure'
import { settlePaymentDueProcedure } from '@/trpc/routers/groups/payment-dues/settle.procedure'

export const groupPaymentDuesRouter = createTRPCRouter({
  list: listGroupPaymentDuesProcedure,
  create: createPaymentDueProcedure,
  settle: settlePaymentDueProcedure,
  cancel: cancelPaymentDueProcedure,
})
