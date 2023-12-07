import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getGroup, getGroupExpenses } from '@/lib/api'
import { cn } from '@/lib/utils'
import { ChevronRight, Plus } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

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
        {expenses.length > 0 ? (
          expenses.map((expense) => (
            <div
              className={cn(
                'border-t flex justify-between pl-6 pr-2 py-4 text-sm',
                expense.isReimbursement && 'italic',
              )}
            >
              <div>
                <div>{expense.title}</div>
                <div className="text-xs text-muted-foreground">
                  Paid by{' '}
                  <Badge variant="secondary">
                    {
                      group.participants.find((p) => p.id === expense.paidById)
                        ?.name
                    }
                  </Badge>{' '}
                  for{' '}
                  {expense.paidFor.map((paidFor, index) => (
                    <Badge variant="secondary" key={index} className="mr-1">
                      {
                        group.participants.find(
                          (p) => p.id === paidFor.participantId,
                        )?.name
                      }
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center">
                <div className="tabular-nums whitespace-nowrap font-bold">
                  {group.currency} {expense.amount.toFixed(2)}
                </div>
                <Button size="icon" variant="link" className="-my-2" asChild>
                  <Link href={`/groups/${groupId}/expenses/${expense.id}/edit`}>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </div>
          ))
        ) : (
          <p className="px-6 text-sm py-6">
            Your group doesn’t contain any expense yet.{' '}
            <Button variant="link" asChild className="-m-3">
              <Link href={`/groups/${groupId}/expenses/create`}>
                Create the first one
              </Link>
            </Button>
          </p>
        )}
        {/* <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Paid by</TableHead>
                <TableHead>Paid for</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-0"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow
                  key={expense.id}
                  className={cn(expense.isReimbursement && 'italic')}
                >
                  <TableCell>{expense.title}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {
                        group.participants.find(
                          (p) => p.id === expense.paidById,
                        )?.name
                      }
                    </Badge>
                  </TableCell>
                  <TableCell className="flex flex-wrap gap-1">
                    {expense.paidFor.map((paidFor, index) => (
                      <Badge variant="secondary" key={index}>
                        {
                          group.participants.find(
                            (p) => p.id === paidFor.participantId,
                          )?.name
                        }
                      </Badge>
                    ))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums whitespace-nowrap">
                    {group.currency} {expense.amount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="link"
                      className="-my-2"
                      asChild
                    >
                      <Link
                        href={`/groups/${groupId}/expenses/${expense.id}/edit`}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="p-6">Your group doesn’t have any expense yet.</div>
        )} */}
      </CardContent>
    </Card>
  )
}
