import { ExpenseList } from '@/app/groups/[groupId]/expenses/expense-list'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getGroup, getGroupExpenses } from '@/lib/api'
import { Plus } from 'lucide-react'
import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Expenses',
}

export default async function GroupExpensesPage({
  params: { groupId },
}: {
  params: { groupId: string }
}) {
  const group = await getGroup(groupId)
  if (!group) notFound()

  const expenses = await getGroupExpenses(groupId)

  return (
    <Card className="mb-4">
      <div className="flex flex-1">
        <CardHeader className="flex-1">
          <CardTitle>Expenses</CardTitle>
          <CardDescription>
            Here are the expenses that you created for your group.
          </CardDescription>
        </CardHeader>
        <CardHeader>
          <Button asChild size="icon">
            <Link href={`/groups/${groupId}/expenses/create`}>
              <Plus />
            </Link>
          </Button>
        </CardHeader>
      </div>

      <CardContent className="p-0">
        <ExpenseList
          expenses={expenses}
          groupId={groupId}
          currency={group.currency}
          participants={group.participants}
        />
      </CardContent>
    </Card>
  )
}
