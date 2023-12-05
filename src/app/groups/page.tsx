import { RecentGroupList } from '@/app/groups/recent-group-list'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function GroupsPage() {
  return (
    <main>
      <Button asChild>
        <Link href="/groups/create">New group</Link>
      </Button>
      <RecentGroupList />
    </main>
  )
}
