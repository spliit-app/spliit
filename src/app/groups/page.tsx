import { RecentGroupList } from '@/app/groups/recent-group-list'
import { Button } from '@/components/ui/button'
import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Recently visited groups',
}

export default async function GroupsPage() {
  return (
    <main>
      <h1 className="font-bold text-2xl mb-4">
        <Link href="/groups">Recently visited groups</Link>
      </h1>
      <Button asChild>
        <Link href="/groups/create">New group</Link>
      </Button>
      <RecentGroupList />
    </main>
  )
}
