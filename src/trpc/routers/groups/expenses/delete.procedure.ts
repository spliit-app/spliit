import { deleteExpense, getGroup, getExpense} from '@/lib/api'
import { baseProcedure } from '@/trpc/init'
import { sendNotification } from '@/lib/notification'
import { env } from '@/lib/env'
import { z } from 'zod'
import {getTranslations} from 'next-intl/server';

export const deleteGroupExpenseProcedure = baseProcedure
  .input(
    z.object({
      expenseId: z.string().min(1),
      groupId: z.string().min(1),
      participantId: z.string().optional(),
    }),
  )
  .mutation(async ({ input: { expenseId, groupId, participantId } }) => {
    if (env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS) {
      const expense = await getExpense(groupId, expenseId);
      const group = await getGroup(groupId);
      const t = await getTranslations('Notifications');
        const msg = t('Expense.deleted', {
          groupName: group!.name,
          groupUrl: `${env.NEXT_PUBLIC_BASE_URL}/groups/${groupId}`,
          expenseTitle: expense!.title,
          participantName: group!.participants.find((p) => p.id == participantId)!.name
        })
      await sendNotification(group!.telegramChatId ?? '', msg);
    }

    await deleteExpense(groupId, expenseId, participantId);
    return {}
  })
