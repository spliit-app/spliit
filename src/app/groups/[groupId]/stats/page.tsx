import { cached } from '@/app/cached-functions'
import { TotalsGroupSpending } from '@/app/groups/[groupId]/totals-group-spending'
import { TotalsYourShare } from '@/app/groups/[groupId]/totals-your-share'
import { TotalsYourSpendings } from '@/app/groups/[groupId]/totals-your-spending'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getGroupExpenses } from '@/lib/api'
import { getTotalGroupSpending } from '@/lib/totals'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Totals',
}

export default async function TotalsPage({
  params: { groupId },
}: {
  params: { groupId: string }
}) {
  const group = await cached.getGroup(groupId)
  if (!group) notFound()

  const expenses = await getGroupExpenses(groupId)
  const totalGroupSpendings = getTotalGroupSpending(expenses)

  return (
    <>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Totals</CardTitle>
          <CardDescription>
            Spending summary of the entire group.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col space-y-4">
          <TotalsGroupSpending
            totalGroupSpendings={totalGroupSpendings}
            currency={group.currency}
          />
          <TotalsYourSpendings group={group} expenses={expenses} />
          <TotalsYourShare group={group} expenses={expenses} />
        </CardContent>
      </Card>
    </>
  )
}
