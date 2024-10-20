import { EditGroup } from '@/app/groups/[groupId]/edit/edit-group'
import { Metadata } from 'next'
import { getRuntimeFeatureFlags } from '@/lib/featureFlags'

export const metadata: Metadata = {
  title: 'Settings',
}

export default async function EditGroupPage({
  params: { groupId },
}: {
  params: { groupId: string }
}) {
  return <EditGroup
    groupId={groupId}
    runtimeFeatureFlags={await getRuntimeFeatureFlags()}
  />
}
