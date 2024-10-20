import { cached } from '@/app/cached-functions'
import BalancesAndReimbursements from '@/app/groups/[groupId]/balances/balances-and-reimbursements'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Balances',
}

export default async function GroupPage({
  params: { groupId },
}: {
  params: { groupId: string }
}) {
  const group = await cached.getGroup(groupId)
  if (!group) notFound()

  return <BalancesAndReimbursements groupId={groupId} />
}
