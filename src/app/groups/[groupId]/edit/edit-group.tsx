'use client'
import { GroupForm } from '@/components/group-form'
import { RuntimeFeatureFlags } from '@/lib/featureFlags'
import { trpc } from '@/trpc/client'

export const EditGroup = ({
  groupId,
  runtimeFeatureFlags,
}: {
  groupId: string
  runtimeFeatureFlags: RuntimeFeatureFlags
}) => {
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
      runtimeFeatureFlags={runtimeFeatureFlags}
    />
  )
}
