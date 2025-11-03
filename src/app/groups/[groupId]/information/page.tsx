import GroupInformation from '@/app/groups/[groupId]/information/group-information'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Group Information',
}

export default async function InformationPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params
  return <GroupInformation groupId={groupId} />
}
