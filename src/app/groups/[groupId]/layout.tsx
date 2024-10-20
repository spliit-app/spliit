import { cached } from '@/app/cached-functions'
import { GroupHeader } from '@/app/groups/[groupId]/group-header'
import { SaveGroupLocally } from '@/app/groups/[groupId]/save-recent-group'
import { Metadata } from 'next'
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
      <GroupHeader groupId={groupId} />

      {children}

      <SaveGroupLocally group={{ id: group.id, name: group.name }} />
    </>
  )
}
