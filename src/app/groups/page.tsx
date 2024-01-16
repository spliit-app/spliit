import { RecentGroupList } from '@/app/groups/recent-group-list'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Recently visited groups',
}

export default async function GroupsPage() {
  return (
    <>
      <div className="flex justify-between items-center gap-4">
        <h1 className="font-bold text-2xl">
          <Link href="/groups">My groups</Link>
        </h1>
        <Button asChild size="icon">
          <Link href="/groups/create">
            <Plus className="w-4 h-4" />
          </Link>
        </Button>
      </div>
      <div>
        <RecentGroupList />
      </div>
    </>
  )
}
