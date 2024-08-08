'use client'
import { useSummary } from '@/app/groups/[groupId]/activity/activity-item'
import { Button } from '@/components/ui/button'
import { getExpense, getGroup } from '@/lib/api'
import { DateTimeStyle, cn, formatDate } from '@/lib/utils'
import { Activity, Participant } from '@prisma/client'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'

type Props = {
  group: NonNullable<Awaited<ReturnType<typeof getGroup>>>
  activity: Activity
  participant?: Participant
  expense?: Awaited<ReturnType<typeof getExpense>>
  dateStyle: DateTimeStyle
}

export function ExpenseActivityItem({
  group,
  activity,
  participant,
  expense,
  dateStyle,
}: Props) {
  const router = useRouter()
  const summary = useSummary(activity, participant?.name)
  const locale = useLocale()

  return (
    <div
      className={cn(
        'flex justify-between sm:rounded-lg px-2 sm:pr-1 sm:pl-2 py-2 text-sm hover:bg-accent gap-1 items-stretch',
        'cursor-pointer',
      )}
    >
      <div className="flex flex-col justify-between items-start">
        {dateStyle !== undefined && (
          <div className="mt-1 text-xs/5 text-muted-foreground">
            {formatDate(activity.time, locale, { dateStyle })}
          </div>
        )}
        <div className="my-1 text-xs/5 text-muted-foreground">
          {formatDate(activity.time, locale, { timeStyle: 'short' })}
        </div>
      </div>
      <div className="flex-1">
        <div className="m-1">{summary}</div>
      </div>
      <Button
        size="icon"
        variant="link"
        className="self-center hidden sm:flex w-5 h-5"
        asChild
      ></Button>
    </div>
  )
}
