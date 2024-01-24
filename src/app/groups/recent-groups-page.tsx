'use client'
import { AddGroupByUrlButton } from '@/app/groups/add-group-by-url-button'
import { RecentGroupList } from '@/app/groups/recent-group-list'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function RecentGroupsPage() {
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h1 className="font-bold text-2xl flex-1">
          <Link href="/groups">My groups</Link>
        </h1>
        <div className="flex gap-2">
          <AddGroupByUrlButton reload={() => {}} />
          <Button asChild>
            <Link href="/groups/create">
              {/* <Plus className="w-4 h-4 mr-2" /> */}
              <>Create</>
            </Link>
          </Button>
        </div>
      </div>
      <div>
        <RecentGroupList />
      </div>
    </>
  )
}
