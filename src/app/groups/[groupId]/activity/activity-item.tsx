'use client'
import { Button } from '@/components/ui/button'
import { DateTimeStyle, cn, formatDate } from '@/lib/utils'
import { AppRouterOutput } from '@/trpc/routers/_app'
import { ActivityType, Participant } from '@prisma/client'
import { ChevronRight } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export type Activity =
  AppRouterOutput['groups']['activities']['list']['activities'][number]

type Props = {
  groupId: string
  activity: Activity
  participant?: Participant
  dateStyle: DateTimeStyle
}

function useSummary(
  activity: Activity,
  participantName?: string,
  expenseTitleOverride?: string,
) {
  const t = useTranslations('Activity')
  const participant = participantName ?? t('someone')
  const expense = expenseTitleOverride ?? activity.data ?? ''

  const tr = (key: string) =>
    t.rich(key, {
      expense,
      participant,
      em: (chunks) => <em>&ldquo;{chunks}&rdquo;</em>,
      strong: (chunks) => <strong>{chunks}</strong>,
    })

  if (activity.activityType == ActivityType.UPDATE_GROUP) {
    return <>{tr('settingsModified')}</>
  } else if (activity.activityType == ActivityType.CREATE_EXPENSE) {
    return <>{tr('expenseCreated')}</>
  } else if (activity.activityType == ActivityType.UPDATE_EXPENSE) {
    return <>{tr('expenseUpdated')}</>
  } else if (activity.activityType == ActivityType.DELETE_EXPENSE) {
    return <>{tr('expenseDeleted')}</>
  }
}

export function ActivityItem({
  groupId,
  activity,
  participant,
  dateStyle,
}: Props) {
  const router = useRouter()
  const locale = useLocale()

  const expenseExists = activity.expense !== undefined
  let expenseTitle = activity.data ?? ''
  let importDate: string | undefined
  if (activity.participantId === null && activity.data?.startsWith('{')) {
    try {
      const parsed = JSON.parse(activity.data)
      if (parsed && typeof parsed === 'object') {
        const { title, importDate: parsedImportDate } = parsed as {
          title?: unknown
          importDate?: unknown
        }
        if (typeof title === 'string') expenseTitle = title
        if (typeof parsedImportDate === 'string') importDate = parsedImportDate
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('Failed to parse activity.data JSON', {
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
        })
      }
      // fall back to defaults if parsing fails
    }
  }

  const participantDisplay =
    participant?.name ??
    (activity.participantId === null
      ? `Import (${formatDate(
          importDate ? new Date(importDate) : activity.time,
          locale,
          { dateStyle: 'medium' },
        )})`
      : undefined)
  const summary = useSummary(activity, participantDisplay, expenseTitle)

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
