import { GroupForm } from '@/components/group-form'
import { getGroup, getGroupExpensesParticipants, updateGroup } from '@/lib/api'
import { groupFormSchema } from '@/lib/schemas'
import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Settings',
}

export default async function EditGroupPage({
  params: { groupId },
}: {
  params: { groupId: string }
}) {
  const group = await getGroup(groupId)
  if (!group) notFound()

  async function updateGroupAction(values: unknown) {
    'use server'
    const groupFormValues = groupFormSchema.parse(values)
    const group = await updateGroup(groupId, groupFormValues)
    redirect(`/groups/${group.id}`)
  }

  const protectedParticipantIds = await getGroupExpensesParticipants(groupId)
  return (
    <GroupForm
      group={group}
      onSubmit={updateGroupAction}
      protectedParticipantIds={protectedParticipantIds}
    />
  )
}
