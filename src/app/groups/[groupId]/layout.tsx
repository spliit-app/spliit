import { cached } from '@/app/cached-functions'
import { Metadata } from 'next'
import { PropsWithChildren } from 'react'
import { GroupLayoutClient } from './layout.client'

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

export default function GroupLayout({
  children,
  params: { groupId },
}: PropsWithChildren<Props>) {
  return <GroupLayoutClient groupId={groupId}>{children}</GroupLayoutClient>
}
