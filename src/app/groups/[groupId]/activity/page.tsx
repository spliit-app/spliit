import { ActivityPageClient } from '@/app/groups/[groupId]/activity/page.client'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Activity',
}

export default async function ActivityPage({
  params: { groupId },
}: {
  params: { groupId: string }
}) {
  return <ActivityPageClient groupId={groupId} />
}
