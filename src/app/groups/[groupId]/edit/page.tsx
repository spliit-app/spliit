import { GroupForm } from '@/components/group-form'
import { Button } from '@/components/ui/button'
import { getGroup, updateGroup } from '@/lib/api'
import { groupFormSchema } from '@/lib/schemas'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

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

  return (
    <main>
      <div className="mb-4">
        <Button variant="ghost" asChild>
          <Link href={`/groups/${groupId}`}>
            <ChevronLeft className="w-4 h-4 mr-2" /> Back to group
          </Link>
        </Button>
      </div>
      <GroupForm group={group} onSubmit={updateGroupAction} />
    </main>
  )
}
