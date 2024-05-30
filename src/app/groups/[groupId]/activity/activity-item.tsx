'use client'
import { Button } from '@/components/ui/button'
import { getGroupExpenses } from '@/lib/api'
import { DateTimeStyle, cn, formatDate } from '@/lib/utils'
import { Activity, ActivityType, Participant } from '@prisma/client'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Props = {
  groupId: string
  activity: Activity
  participant?: Participant
  expense?: Awaited<ReturnType<typeof getGroupExpenses>>[number]
  dateStyle: DateTimeStyle
}

function getSummary(activity: Activity, participantName?: string) {
  const participant = participantName ?? 'Someone'
  const expense = activity.data ?? ''
  if (activity.activityType == ActivityType.UPDATE_GROUP) {
    return (
      <>
        Group settings were modified by <strong>{participant}</strong>
      </>
    )
  } else if (activity.activityType == ActivityType.CREATE_EXPENSE) {
    return (
      <>
        Expense <em>&ldquo;{expense}&rdquo;</em> created by{' '}
        <strong>{participant}</strong>.
      </>
    )
  } else if (activity.activityType == ActivityType.UPDATE_EXPENSE) {
    return (
      <>
        Expense <em>&ldquo;{expense}&rdquo;</em> updated by{' '}
        <strong>{participant}</strong>.
      </>
    )
  } else if (activity.activityType == ActivityType.DELETE_EXPENSE) {
    return (
      <>
        Expense <em>&ldquo;{expense}&rdquo;</em> deleted by{' '}
        <strong>{participant}</strong>.
      </>
    )
  }
}

export function ActivityItem({
  groupId,
  activity,
  participant,
  expense,
  dateStyle,
}: Props) {
  const router = useRouter()

  const expenseExists = expense !== undefined
  const summary = getSummary(activity, participant?.name)

  return (
    <div
      className={cn(
        'flex justify-between sm:rounded-lg px-2 sm:pr-1 sm:pl-2 py-2 text-sm hover:bg-accent gap-1 items-stretch',
        expenseExists && 'cursor-pointer',
      )}
      onClick={() => {
        if (expenseExists) {
          router.push(`/groups/${groupId}/expenses/${activity.expenseId}/edit`)
        }
      }}
    >
      <div className="flex flex-col justify-between items-start">
        {dateStyle !== undefined && (
          <div className="mt-1 text-xs/5 text-muted-foreground">
            {formatDate(activity.time, { dateStyle })}
          </div>
        )}
        <div className="my-1 text-xs/5 text-muted-foreground">
          {formatDate(activity.time, { timeStyle: 'short' })}
        </div>
      </div>
      <div className="flex-1">
        <div className="m-1">{summary}</div>
      </div>
      {expenseExists && (
        <Button
          size="icon"
          variant="link"
          className="self-center hidden sm:flex w-5 h-5"
          asChild
        >
          <Link href={`/groups/${groupId}/expenses/${activity.expenseId}/edit`}>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </Button>
      )}
    </div>
  )
}
