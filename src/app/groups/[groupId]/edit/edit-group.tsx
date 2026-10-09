'use client'

import { GroupForm } from '@/components/group-form'
import { useToast } from '@/components/ui/use-toast'
import { trpc } from '@/trpc/client'
import { isTRPCClientError } from '@trpc/client'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { useCurrentGroup } from '../current-group-context'

export const EditGroup = () => {
  const { groupId } = useCurrentGroup()
  const { data, isLoading } = trpc.groups.getDetails.useQuery({ groupId })
  const { mutateAsync } = trpc.groups.update.useMutation()
  const utils = trpc.useUtils()
  const { toast } = useToast()
  const t = useTranslations('GroupForm.Participants')
  // Bumped to remount the form on the refreshed group after a refused save.
  const [formKey, setFormKey] = useState(0)

  if (isLoading) return <></>

  return (
    <GroupForm
      key={formKey}
      group={data?.group}
      onSubmit={async (groupFormValues, participantId) => {
        try {
          await mutateAsync({ groupId, participantId, groupFormValues })
        } catch (error) {
          if (!isTRPCClientError(error) || error.data?.code !== 'CONFLICT')
            throw error
          // Someone added an expense for a participant removed here since the
          // page loaded. Reload the group so they come back, now protected.
          const fresh = await utils.groups.getDetails.fetch(
            { groupId },
            { staleTime: 0 },
          )
          const names = (data?.group?.participants ?? [])
            .filter(
              (p) =>
                !groupFormValues.participants.some(({ id }) => id === p.id) &&
                fresh.participantsWithExpenses.includes(p.id),
            )
            .map((p) => p.name)
          toast({
            description: t('removedParticipantHasExpenses', {
              names: names.join(', '),
              count: names.length,
            }),
            variant: 'destructive',
          })
          setFormKey((key) => key + 1)
          return
        }
        await utils.groups.invalidate()
      }}
      protectedParticipantIds={data?.participantsWithExpenses}
    />
  )
}
