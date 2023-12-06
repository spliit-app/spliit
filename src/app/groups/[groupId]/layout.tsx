import { Button } from '@/components/ui/button'
import { getGroup } from '@/lib/api'
import { ChevronLeft, Edit } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PropsWithChildren } from 'react'

export default async function GroupLayout({
  children,
  params: { groupId },
}: PropsWithChildren<{
  params: { groupId: string }
}>) {
  const group = await getGroup(groupId)
  if (!group) notFound()

  return (
    <>
      <div className="mb-4 flex justify-between">
        <Button variant="ghost" asChild>
          <Link href="/groups">
            <ChevronLeft className="w-4 h-4 mr-2" /> Back to recent groups
          </Link>
        </Button>
      </div>

      <div className="flex justify-between items-baseline mb-4">
        <h1 className="font-bold text-2xl">
          <Link href={`/groups/${groupId}`}>{group.name}</Link>
        </h1>

        <Button variant="secondary" asChild>
          <Link href={`/groups/${groupId}/edit`}>
            <Edit className="w-4 h-4 mr-2" /> Edit group settings
          </Link>
        </Button>
      </div>

      {children}
    </>
  )
}
