import { redirect } from 'next/navigation'

export default async function GroupPage({
  params: { groupId },
}: {
  params: { groupId: string }
}) {
  redirect(`/groups/${groupId}/expenses`)
}
