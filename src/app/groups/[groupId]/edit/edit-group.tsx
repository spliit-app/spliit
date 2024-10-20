'use client'

import { GroupForm } from '@/components/group-form'
import { trpc } from '@/trpc/client'

export const EditGroup = ({ groupId }: { groupId: string }) => {
  const { data, isLoading } = trpc.groups.get.useQuery({ groupId })
  const { mutateAsync } = trpc.groups.update.useMutation()
  const utils = trpc.useUtils()

  if (isLoading) return <></>

  return (
    <GroupForm
      group={data?.group}
      onSubmit={async (groupFormValues, participantId) => {
        await mutateAsync({ groupId, participantId, groupFormValues })
        await utils.groups.invalidate()
      }}
      protectedParticipantIds={data?.participantsWithExpenses}
    />
  )
}
