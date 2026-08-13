import { RecentGroupList } from '@/app/groups/recent-group-list'
import { TrackPage } from '@/lib/analytics/track-page'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Recently visited groups',
}

export default async function GroupsPage() {
  return (
    <>
      <TrackPage path="/groups" />
      <RecentGroupList />
    </>
  )
}
