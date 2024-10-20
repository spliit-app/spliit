import { CreateGroup } from '@/app/groups/create/create-group'
import { getRuntimeFeatureFlags } from '@/lib/featureFlags'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create Group',
}

export default async function CreateGroupPage() {
  return <CreateGroup runtimeFeatureFlags={await getRuntimeFeatureFlags()} />
}
