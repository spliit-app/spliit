import { BalancesList } from '@/app/groups/[groupId]/balances-list'
import { ReimbursementList } from '@/app/groups/[groupId]/reimbursement-list'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getGroup, getGroupExpenses } from '@/lib/api'
import { getBalances, getSuggestedReimbursements } from '@/lib/balances'
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
  const group = await getGroup(groupId)
  if (!group) notFound()

  const expenses = await getGroupExpenses(groupId)
  const balances = getBalances(expenses)
  const reimbursements = getSuggestedReimbursements(balances)

  return (
    <>
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
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Suggested reimbursements</CardTitle>
          <CardDescription>
            Here are suggestions for optimized reimbursements between
            participants.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ReimbursementList
            reimbursements={reimbursements}
            participants={group.participants}
            currency={group.currency}
            groupId={groupId}
          />
        </CardContent>
      </Card>
    </>
  )
}
