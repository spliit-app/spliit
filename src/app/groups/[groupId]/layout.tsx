import { GroupTabs } from '@/app/groups/[groupId]/group-tabs'
import { SaveGroupLocally } from '@/app/groups/[groupId]/save-recent-group'
import { ShareButton } from '@/app/groups/[groupId]/share-button'
import { getGroup } from '@/lib/api'
import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PropsWithChildren } from 'react'

type Props = {
  params: {
    groupId: string
  }
}

export async function generateMetadata({
  params: { groupId },
}: Props): Promise<Metadata> {
  const group = await getGroup(groupId)

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
  const group = await getGroup(groupId)
  if (!group) notFound()

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <h1 className="font-bold text-2xl">
          <Link href={`/groups/${groupId}`}>{group.name}</Link>
        </h1>

        <div className="flex gap-2 justify-between">
          <GroupTabs groupId={groupId} />
          <ShareButton group={group} />
        </div>
      </div>

      {children}

      <SaveGroupLocally group={{ id: group.id, name: group.name }} />
    </>
  )
}
