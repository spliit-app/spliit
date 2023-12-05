import { SaveGroupLocally } from '@/app/groups/[groupId]/save-recent-group'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getGroup, getGroupExpenses } from '@/lib/api'
import { ChevronLeft, ChevronRight, Edit, Plus } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function GroupPage({
  params: { groupId },
}: {
  params: { groupId: string }
}) {
  const group = await getGroup(groupId)
  if (!group) notFound()

  const expenses = await getGroupExpenses(groupId)

  return (
    <main>
      <div className="mb-4 flex justify-between">
        <Button variant="ghost" asChild>
          <Link href="/groups">
            <ChevronLeft className="w-4 h-4 mr-2" /> Back to recent groups
          </Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href={`/groups/${groupId}/edit`}>
            <Edit className="w-4 h-4 mr-2" /> Edit group settings
          </Link>
        </Button>
      </div>

      <h1 className="font-bold mb-4">{group.name}</h1>

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
          <Table className="">
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
                <TableRow key={expense.id}>
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
                  <TableCell className="text-right tabular-nums">
                    $ {expense.amount.toFixed(2)}
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
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Participants</CardTitle>
        </CardHeader>
        <CardContent>
          <ul>
            {group.participants.map((participant) => (
              <li key={participant.id}>{participant.name}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <SaveGroupLocally group={{ id: group.id, name: group.name }} />
    </main>
  )
}
