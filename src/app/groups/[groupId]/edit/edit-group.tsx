'use client'

import { GroupForm } from '@/components/group-form'
import {
  deleteRecentGroup,
  unarchiveGroup,
  unstarGroup,
} from '@/app/groups/recent-groups-helpers'
import { useToast } from '@/components/ui/use-toast'
import { trpc } from '@/trpc/client'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useCurrentGroup } from '../current-group-context'

export const EditGroup = () => {
  const { groupId } = useCurrentGroup()
  const { data, isLoading } = trpc.groups.getDetails.useQuery({ groupId })
  const { mutateAsync } = trpc.groups.update.useMutation()
  const { mutateAsync: deleteGroupMutateAsync } =
    trpc.groups.delete.useMutation()
  const utils = trpc.useUtils()
  const router = useRouter()
  const { toast } = useToast()
  const t = useTranslations('GroupForm.Settings')
  const [isDeleting, setIsDeleting] = useState(false)

  if (isLoading) return <></>

  const group = data?.group

  return (
    <GroupForm
      group={group}
      onSubmit={async (groupFormValues, participantId) => {
        await mutateAsync({ groupId, participantId, groupFormValues })
        await utils.groups.invalidate()
      }}
      protectedParticipantIds={data?.participantsWithExpenses}
      onDelete={
        group
          ? async () => {
              if (isDeleting) return
              try {
                setIsDeleting(true)
                await deleteGroupMutateAsync({ groupId })
                deleteRecentGroup({ id: group.id, name: group.name })
                unstarGroup(group.id)
                unarchiveGroup(group.id)
                localStorage.removeItem(`${group.id}-activeUser`)
                await utils.groups.invalidate()
                toast({ title: t('deleteSuccess') })
                router.push('/groups')
              } catch (error) {
                console.error(error)
                toast({
                  title: t('deleteError'),
                  variant: 'destructive',
                })
              } finally {
                setIsDeleting(false)
              }
            }
          : undefined
      }
      isDeleting={isDeleting}
    />
  )
}
