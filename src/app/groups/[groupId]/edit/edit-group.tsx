'use client'

import { DeleteDataButton } from '@/components/delete-data-button'
import { GroupForm } from '@/components/group-form'
import { trpc } from '@/trpc/client'
import { useEffect, useState } from 'react'
import { useCurrentGroup } from '../current-group-context'

export const EditGroup = () => {
  const { groupId } = useCurrentGroup()
  const { data, isLoading } = trpc.groups.getDetails.useQuery({ groupId })
  const { mutateAsync } = trpc.groups.update.useMutation()
  const utils = trpc.useUtils()
  const [hasImportedData, setHasImportedData] = useState(false)

  useEffect(() => {
    const checkForImportedData = async () => {
      try {
        const response = await fetch(`/api/groups/${groupId}/has-import-marker`)
        const result = (await response.json()) as { hasImportMarker: boolean }
        setHasImportedData(result.hasImportMarker)
      } catch {
        setHasImportedData(false)
      }
    }
    checkForImportedData()
  }, [groupId])

  if (isLoading) return <></>

  return (
    <>
      <GroupForm
        group={data?.group}
        onSubmit={async (groupFormValues, participantId) => {
          await mutateAsync({ groupId, participantId, groupFormValues })
          await utils.groups.invalidate()
        }}
        protectedParticipantIds={data?.participantsWithExpenses}
      />
      <div className="mt-4">
        <DeleteDataButton groupId={groupId} hasImportedData={hasImportedData} />
      </div>
    </>
  )
}
