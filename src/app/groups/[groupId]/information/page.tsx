import GroupInformation from '@/app/groups/[groupId]/information/group-information'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Group Information',
}

export default function InformationPage({
  params: { groupId },
}: {
  params: { groupId: string }
}) {
  return <GroupInformation groupId={groupId} />
}
