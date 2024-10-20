import { getGroup, updateExpense } from '@/lib/api'
import { env } from '@/lib/env'
import { sendNotification } from '@/lib/notification'
import { expenseFormSchema } from '@/lib/schemas'
import { baseProcedure } from '@/trpc/init'
import { getTranslations } from 'next-intl/server'
import { z } from 'zod'

export const updateGroupExpenseProcedure = baseProcedure
  .input(
    z.object({
      expenseId: z.string().min(1),
      groupId: z.string().min(1),
      expenseFormValues: expenseFormSchema,
      participantId: z.string().optional(),
    }),
  )
  .mutation(
    async ({
      input: { expenseId, groupId, expenseFormValues, participantId },
    }) => {
      const expense = await updateExpense(
        groupId,
        expenseId,
        expenseFormValues,
        participantId,
      )

      if (env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS) {
        const group = await getGroup(groupId)

        if (group?.telegramChatId != '') {
          const groupUrl = `${env.NEXT_PUBLIC_BASE_URL}/groups/${groupId}`
          const expenseUrl = `${groupUrl}/expenses/${expense.id}`
          const t = await getTranslations('Notifications')
          const msg = t('Expense.updated', {
            groupName: group!.name,
            groupUrl: groupUrl,
            expenseTitle: expenseFormValues.title,
            expenseUrl: expenseUrl,
            participantName: group!.participants.find(
              (p) => p.id == participantId,
            )!.name,
          })
          await sendNotification(group!.telegramChatId!, msg)
        }
      }

      return { expenseId: expense.id }
    },
  )
