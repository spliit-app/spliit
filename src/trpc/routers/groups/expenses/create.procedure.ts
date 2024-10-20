import { createExpense, getGroup } from '@/lib/api'
import { env } from '@/lib/env'
import { sendNotification } from '@/lib/notification'
import { expenseFormSchema } from '@/lib/schemas'
import { baseProcedure } from '@/trpc/init'
import { getTranslations } from 'next-intl/server'
import { z } from 'zod'

export const createGroupExpenseProcedure = baseProcedure
  .input(
    z.object({
      groupId: z.string().min(1),
      expenseFormValues: expenseFormSchema,
      participantId: z.string().optional(),
    }),
  )
  .mutation(
    async ({ input: { groupId, expenseFormValues, participantId } }) => {
      const expense = await createExpense(
        expenseFormValues,
        groupId,
        participantId,
      )

      if (env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS) {
        const group = await getGroup(groupId)
        const groupUrl = `${env.NEXT_PUBLIC_BASE_URL}/groups/${groupId}`
        const expenseUrl = `${groupUrl}/expenses/${expense.id}/edit`

        const t = await getTranslations('Notifications')
        const msg = t('Expense.created', {
          groupName: group!.name,
          groupUrl: groupUrl,
          expenseTitle: expenseFormValues.title,
          expenseUrl: expenseUrl,
          groupCurrency: group!.currency,
          // Escape the decimal point in the amount.
          expenseAmount: (expense.amount / 100)
            .toFixed(2)
            .toString()
            .replace('.', '\\.'),
          participantName: group!.participants.find(
            (p) => p.id == participantId,
          )!.name,
        })
        await sendNotification(group!.telegramChatId ?? '', msg)
      }

      return { expenseId: expense.id }
    },
  )
