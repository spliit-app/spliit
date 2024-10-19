'use client'

import { GroupForm } from '@/components/group-form'
import { trpc } from '@/trpc/client'

export const EditGroup = ({ groupId }: { groupId: string }) => {
  const { data, isLoading } = trpc.groups.get.useQuery({ groupId })
  const { mutateAsync, isPending } = trpc.groups.update.useMutation()
  const utils = trpc.useUtils()

  // async function updateGroupAction(values: unknown, participantId?: string) {
  //   'use server'
  //   const groupFormValues = groupFormSchema.parse(values)
  //   const group = await updateGroup(groupId, groupFormValues, participantId)
  //   redirect(`/groups/${group.id}`)
  // }

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
