'use client'
import { Button } from '@/components/ui/button'
import { getGroupExpenses } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Participant } from '@prisma/client'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Fragment } from 'react'

type Props = {
  expenses: Awaited<ReturnType<typeof getGroupExpenses>>
  participants: Participant[]
  currency: string
  groupId: string
}

export function ExpenseList({
  expenses,
  currency,
  participants,
  groupId,
}: Props) {
  const getParticipant = (id: string) => participants.find((p) => p.id === id)
  const router = useRouter()

  return expenses.length > 0 ? (
    expenses.map((expense) => (
      <div
        key={expense.id}
        className={cn(
          'border-t flex justify-between pl-6 pr-2 py-4 text-sm cursor-pointer hover:bg-accent',
          expense.isReimbursement && 'italic',
        )}
        onClick={() => {
          router.push(`/groups/${groupId}/expenses/${expense.id}/edit`)
        }}
      >
        <div>
          <div className={cn('mb-1', expense.isReimbursement && 'italic')}>
            {expense.title}
          </div>
          <div className="text-xs text-muted-foreground">
            Paid by <strong>{getParticipant(expense.paidById)?.name}</strong>{' '}
            for{' '}
            {expense.paidFor.map((paidFor, index) => (
              <Fragment key={index}>
                {index !== 0 && <>, </>}
                <strong>
                  {
                    participants.find((p) => p.id === paidFor.participantId)
                      ?.name
                  }
                </strong>
              </Fragment>
            ))}
          </div>
        </div>
        <div className="flex items-center">
          <div
            className={cn(
              'tabular-nums whitespace-nowrap',
              expense.isReimbursement ? 'italic' : 'font-bold',
            )}
          >
            {currency} {(expense.amount / 100).toFixed(2)}
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
      <Button variant="link" asChild className="-m-4">
        <Link href={`/groups/${groupId}/expenses/create`}>
          Create the first one
        </Link>
      </Button>
    </p>
  )
}
