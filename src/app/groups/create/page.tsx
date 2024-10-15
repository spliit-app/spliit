import { GroupForm } from '@/components/group-form'
import { createGroup } from '@/lib/api'
import { getRuntimeFeatureFlags } from '@/lib/featureFlags'
import { groupFormSchema } from '@/lib/schemas'
import { redirect } from 'next/navigation'

export default async function CreateGroupPage() {
  async function createGroupAction(values: unknown) {
    'use server'
    const groupFormValues = groupFormSchema.parse(values)
    const group = await createGroup(groupFormValues)
    redirect(`/groups/${group.id}`)
  }

  return (
    <GroupForm
      onSubmit={createGroupAction}
      runtimeFeatureFlags={await getRuntimeFeatureFlags()}
    />
  )
}
