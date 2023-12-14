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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 items-start">
        <h1 className="font-bold text-2xl">
          <Link href="/groups">Recently visited groups</Link>
        </h1>
        <Button asChild>
          <Link href="/groups/create">
            <Plus className="w-4 h-4 mr-2" />
            Create group
          </Link>
        </Button>
      </div>
      <RecentGroupList />
    </>
  )
}
