import { cached } from '@/app/cached-functions'
import { EditGroup } from '@/app/groups/[groupId]/edit/edit-group'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Settings',
}

export default async function EditGroupPage({
  params: { groupId },
}: {
  params: { groupId: string }
}) {
  const group = await cached.getGroup(groupId)
  if (!group) notFound()

  return <EditGroup groupId={groupId} />
}
