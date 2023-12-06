import { BalancesList } from '@/app/groups/[groupId]/balances-list'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getGroup, getGroupExpenses } from '@/lib/api'
import { getBalances } from '@/lib/balances'
import { notFound } from 'next/navigation'

export default async function GroupPage({
  params: { groupId },
}: {
  params: { groupId: string }
}) {
  const group = await getGroup(groupId)
  if (!group) notFound()

  const expenses = await getGroupExpenses(groupId)
  const balances = getBalances(expenses)

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Balances</CardTitle>
        <CardDescription>
          This is the amount that each participant paid or was paid for.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <BalancesList
          balances={balances}
          participants={group.participants}
          currency={group.currency}
        />
      </CardContent>
    </Card>
  )
}
