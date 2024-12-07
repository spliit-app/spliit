'use client'

import { GroupForm } from '@/components/group-form'
import { RuntimeFeatureFlags } from '@/lib/featureFlags'
import { trpc } from '@/trpc/client'
import { useCurrentGroup } from '../current-group-context'

export const EditGroup = ({
  runtimeFeatureFlags,
}: {
  runtimeFeatureFlags: RuntimeFeatureFlags
}) => {
  const { groupId } = useCurrentGroup()
  const { data, isLoading } = trpc.groups.getDetails.useQuery({ groupId })
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
