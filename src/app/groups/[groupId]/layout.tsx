import { cached } from '@/app/cached-functions'
import { GroupTabs } from '@/app/groups/[groupId]/group-tabs'
import { SaveGroupLocally } from '@/app/groups/[groupId]/save-recent-group'
import { ShareButton } from '@/app/groups/[groupId]/share-button'
import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PropsWithChildren, Suspense } from 'react'

type Props = {
  params: {
    groupId: string
  }
}

export async function generateMetadata({
  params: { groupId },
}: Props): Promise<Metadata> {
  const group = await cached.getGroup(groupId)

  return {
    title: {
      default: group?.name ?? '',
      template: `%s · ${group?.name} · Spliit`,
    },
  }
}

export default async function GroupLayout({
  children,
  params: { groupId },
}: PropsWithChildren<Props>) {
  const group = await cached.getGroup(groupId)
  if (!group) notFound()

  return (
    <>
      <div className="flex flex-col justify-between gap-3">
        <h1 className="font-bold text-2xl">
          <Link href={`/groups/${groupId}`}>{group.name}</Link>
        </h1>

        <div className="flex gap-2 justify-between">
          <Suspense>
            <GroupTabs groupId={groupId} />
          </Suspense>
          <ShareButton group={group} />
        </div>
      </div>

      {children}

      <SaveGroupLocally group={{ id: group.id, name: group.name }} />
    </>
  )
}
