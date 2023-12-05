import { GroupForm } from '@/components/group-form'
import { Button } from '@/components/ui/button'
import { createGroup } from '@/lib/api'
import { groupFormSchema } from '@/lib/schemas'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default function CreateGroupPage() {
  async function createGroupAction(values: unknown) {
    'use server'
    const groupFormValues = groupFormSchema.parse(values)
    const group = await createGroup(groupFormValues)
    redirect(`/groups/${group.id}`)
  }

  return (
    <main>
      <div className="mb-4">
        <Button variant="ghost" asChild>
          <Link href="/groups">
            <ChevronLeft className="w-4 h-4 mr-2" /> Back to recent groups
          </Link>
        </Button>
      </div>
      <GroupForm onSubmit={createGroupAction} />
    </main>
  )
}
