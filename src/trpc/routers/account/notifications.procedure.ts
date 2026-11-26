import { listNotificationsForUser } from '@/lib/payment-dues'
import { protectedProcedure } from '@/trpc/init'

export const notificationsProcedure = protectedProcedure.query(
  async ({ ctx }) => {
    const notifications = await listNotificationsForUser(ctx.user.id)
    return { notifications }
  },
)
