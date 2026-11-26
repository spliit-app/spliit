'use client'

import { useCurrentGroup } from '@/app/groups/[groupId]/current-group-context'
import { GroupForm } from '@/components/group-form'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { RuntimeFeatureFlags } from '@/lib/featureFlags'
import { trpc } from '@/trpc/client'
import { useTranslations } from 'next-intl'

export const EditGroup = ({
  runtimeFeatureFlags,
}: {
  runtimeFeatureFlags: RuntimeFeatureFlags
}) => {
  const { groupId, role } = useCurrentGroup()
  const t = useTranslations('Settings')
  const { data, isLoading } = trpc.groups.getDetails.useQuery({ groupId })
  const { mutateAsync } = trpc.groups.update.useMutation()
  const utils = trpc.useUtils()

  if (isLoading) return <></>

  // The tab is hidden from non-owners, but the URL is still reachable. Say why
  // the form is missing instead of rendering controls whose save would be
  // refused by the server.
  if (role !== 'OWNER') {
    return (
      <Alert>
        <AlertTitle>{t('ownerOnlyTitle')}</AlertTitle>
        <AlertDescription>{t('ownerOnlyDescription')}</AlertDescription>
      </Alert>
    )
  }

  return (
    <GroupForm
      group={data?.group}
      onSubmit={async (groupFormValues) => {
        await mutateAsync({ groupId, groupFormValues })
        await utils.groups.invalidate()
      }}
      protectedParticipantIds={data?.participantsWithExpenses}
      enableGroupDeletion={runtimeFeatureFlags.enableGroupDeletion}
    />
  )
}
