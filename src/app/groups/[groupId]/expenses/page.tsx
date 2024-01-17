import { ActiveUserModal } from '@/app/groups/[groupId]/expenses/active-user-modal'
import { ExpenseList } from '@/app/groups/[groupId]/expenses/expense-list'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getGroup, getGroupExpenses } from '@/lib/api'
import { Download, Plus } from 'lucide-react'
import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

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

  return (
    <>
      <Card className="mb-4 rounded-none -mx-4 border-x-0 sm:border-x sm:rounded-lg sm:mx-0">
        <div className="flex flex-1">
          <CardHeader className="flex-1 p-4 sm:p-6">
            <CardTitle>Expenses</CardTitle>
            <CardDescription>
              Here are the expenses that you created for your group.
            </CardDescription>
          </CardHeader>
          <CardHeader className="p-4 sm:p-6 flex flex-row space-y-0 gap-2">
            <Button variant="secondary" size="icon" asChild>
              <Link
                href={`/groups/${groupId}/expenses/export/json`}
                target="_blank"
              >
                <Download className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild size="icon">
              <Link href={`/groups/${groupId}/expenses/create`}>
                <Plus className="w-4 h-4" />
              </Link>
            </Button>
          </CardHeader>
        </div>

        <CardContent className="p-0 pt-2 pb-4 sm:pb-6 flex flex-col gap-4 relative">
          <Suspense
            fallback={[0, 1, 2].map((i) => (
              <div
                key={i}
                className="border-t flex justify-between items-center px-6 py-4 text-sm"
              >
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-16 rounded-full" />
                  <Skeleton className="h-4 w-32 rounded-full" />
                </div>
                <div>
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
              </div>
            ))}
          >
            <Expenses groupId={groupId} />
          </Suspense>
        </CardContent>
      </Card>

      <ActiveUserModal group={group} />
    </>
  )
}

async function Expenses({ groupId }: { groupId: string }) {
  const group = await getGroup(groupId)
  if (!group) notFound()
  const expenses = await getGroupExpenses(group.id)

  return (
    <ExpenseList
      expenses={expenses}
      groupId={group.id}
      currency={group.currency}
      participants={group.participants}
    />
  )
}
