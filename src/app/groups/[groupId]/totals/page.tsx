import { cached } from '@/app/cached-functions'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getGroupExpenses } from '@/lib/api'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { TotalsGroupSpending } from '@/app/groups/[groupId]/totals-group-spending'
import { getTotalGroupSpending } from '@/lib/totals'
import { TotalsYourSpendings } from '@/app/groups/[groupId]/total-your-spending'
import { TotalsYourShare } from '@/app/groups/[groupId]/total-your-share'

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
          <CardTitle>Total group spending</CardTitle>
          <CardDescription>
          Combined amount of all expenses recorded by the members
          </CardDescription>
        </CardHeader>
        <CardContent>
            <TotalsGroupSpending
                totalGroupSpendings={totalGroupSpendings}
                currency={group.currency}
            />
        </CardContent>
      </Card>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Total you paid for</CardTitle>
          <CardDescription>
          Total amount of money that you have paid on behalf of the group
          </CardDescription>
        </CardHeader>
        <CardContent>
            <TotalsYourSpendings
            group={group}
            expenses={expenses}
            />
        </CardContent>
      </Card>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Your total share</CardTitle>
          <CardDescription>
          Total amount of money that you are responsible for paying
          </CardDescription>
        </CardHeader>
        <CardContent>
            <TotalsYourShare
            group={group}
            expenses={expenses}
            />
        </CardContent>
      </Card>
    </>
  )
}
