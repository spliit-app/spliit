import { createGroup } from '@/lib/api'
import { env } from '@/lib/env'
import { sendNotification } from '@/lib/notification'
import { groupFormSchema } from '@/lib/schemas'
import { baseProcedure } from '@/trpc/init'
import { getTranslations } from 'next-intl/server'
import { z } from 'zod'

export const createGroupProcedure = baseProcedure
  .input(
    z.object({
      groupFormValues: groupFormSchema,
    }),
  )
  .mutation(async ({ input: { groupFormValues } }) => {
    const group = await createGroup(groupFormValues)

    if (
      env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS &&
      groupFormValues.telegramChatId != ''
    ) {
      const t = await getTranslations('Notifications')
      const msg = t('Group.created', {
        groupName: group!.name,
        groupUrl: `${env.NEXT_PUBLIC_BASE_URL}/groups/${group.id}`,
      })
      await sendNotification(group!.telegramChatId ?? '', msg)
    }

    return { groupId: group.id }
  })
