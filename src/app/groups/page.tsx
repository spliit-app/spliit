import { RecentGroupList } from '@/app/groups/recent-group-list'
import { getGlobalGroups } from '@/lib/api'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Recently visited groups',
}

export default async function GroupsPage() {
  return <RecentGroupList globalGroups={await getGlobalGroups()} />
}
