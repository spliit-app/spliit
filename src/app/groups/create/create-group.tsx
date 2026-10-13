'use client'

import { saveRecentGroup } from '@/app/groups/recent-groups-helpers'
import { GroupForm } from '@/components/group-form'
import { trpc } from '@/trpc/client'
import { useRouter } from 'next/navigation'

export const CreateGroup = ({
  defaultCurrencyCode,
}: {
  defaultCurrencyCode: string
}) => {
  const { mutateAsync } = trpc.groups.create.useMutation()
  const utils = trpc.useUtils()
  const router = useRouter()

  return (
    <GroupForm
      defaultCurrencyCode={defaultCurrencyCode}
      onSubmit={async (groupFormValues) => {
        const { groupId } = await mutateAsync({ groupFormValues })
        // Saved here rather than only once the group page has loaded it, so the
        // group is not lost if the user leaves before that.
        saveRecentGroup({ id: groupId, name: groupFormValues.name })
        await utils.groups.invalidate()
        router.push(`/groups/${groupId}`)
      }}
    />
  )
}
