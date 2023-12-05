'use client'
import { getRecentGroups } from '@/app/groups/recent-groups-helpers'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { z } from 'zod'

const recentGroupsSchema = z.array(
  z.object({
    id: z.string().min(1),
    name: z.string(),
  }),
)
type RecentGroups = z.infer<typeof recentGroupsSchema>

type State = { status: 'pending' } | { status: 'success'; groups: RecentGroups }

export function RecentGroupList() {
  const [state, setState] = useState<State>({ status: 'pending' })

  useEffect(() => {
    const groupsInStorage = getRecentGroups()
    setState({ status: 'success', groups: groupsInStorage })
  }, [])

  return (
    <ul className="flex flex-col gap-2 mt-2">
      {state.status === 'pending' ? (
        <li>
          <em>Loading recent groups…</em>
        </li>
      ) : (
        state.groups.map(({ id, name }) => (
          <li key={id}>
            <Button asChild variant="outline">
              <Link href={`/groups/${id}`}>{name}</Link>
            </Button>
          </li>
        ))
      )}
    </ul>
  )
}
