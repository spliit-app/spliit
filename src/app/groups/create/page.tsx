import { CreateGroup } from '@/app/groups/create/create-group'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create Group',
}

export default function CreateGroupPage() {
  return <CreateGroup />
}
