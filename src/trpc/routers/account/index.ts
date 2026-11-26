import { createTRPCRouter } from '@/trpc/init'
import { claimParticipantProcedure } from '@/trpc/routers/account/claimParticipant.procedure'
import { meProcedure } from '@/trpc/routers/account/me.procedure'
import { notificationsProcedure } from '@/trpc/routers/account/notifications.procedure'

export const accountRouter = createTRPCRouter({
  me: meProcedure,
  claimParticipant: claimParticipantProcedure,
  notifications: notificationsProcedure,
})
