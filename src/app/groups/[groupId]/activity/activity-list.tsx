import { ActivityItem } from '@/app/groups/[groupId]/activity/activity-item'
import { getGroupExpenses } from '@/lib/api'
import { Activity, Participant } from '@prisma/client'
import dayjs, { type Dayjs } from 'dayjs'
import { useTranslations } from 'next-intl'

type Props = {
  groupId: string
  participants: Participant[]
  expenses: Awaited<ReturnType<typeof getGroupExpenses>>
  activities: Activity[]
}

export const DATE_GROUPS = {
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  EARLIER_THIS_WEEK: 'earlierThisWeek',
  LAST_WEEK: 'lastWeek',
  EARLIER_THIS_MONTH: 'earlierThisMonth',
  LAST_MONTH: 'lastMonth',
  EARLIER_THIS_YEAR: 'earlierThisYear',
  LAST_YEAR: 'lastYear',
  OLDER: 'older',
}

function getDateGroup(date: Dayjs, today: Dayjs) {
  if (today.isSame(date, 'day')) {
    return DATE_GROUPS.TODAY
  } else if (today.subtract(1, 'day').isSame(date, 'day')) {
    return DATE_GROUPS.YESTERDAY
  } else if (today.isSame(date, 'week')) {
    return DATE_GROUPS.EARLIER_THIS_WEEK
  } else if (today.subtract(1, 'week').isSame(date, 'week')) {
    return DATE_GROUPS.LAST_WEEK
  } else if (today.isSame(date, 'month')) {
    return DATE_GROUPS.EARLIER_THIS_MONTH
  } else if (today.subtract(1, 'month').isSame(date, 'month')) {
    return DATE_GROUPS.LAST_MONTH
  } else if (today.isSame(date, 'year')) {
    return DATE_GROUPS.EARLIER_THIS_YEAR
  } else if (today.subtract(1, 'year').isSame(date, 'year')) {
    return DATE_GROUPS.LAST_YEAR
  } else {
    return DATE_GROUPS.OLDER
  }
}

export function getGroupedActivitiesByDate(activities: Activity[]) {
  const today = dayjs()
  return activities.reduce(
    (result: { [key: string]: Activity[] }, activity: Activity) => {
      const activityGroup = getDateGroup(dayjs(activity.time), today)
      result[activityGroup] = result[activityGroup] ?? []
      result[activityGroup].push(activity)
      return result
    },
    {},
  )
}

export function ActivityList({
  groupId,
  participants,
  expenses,
  activities,
}: Props) {
  const t = useTranslations('Activity')
  const groupedActivitiesByDate = getGroupedActivitiesByDate(activities)

  return activities.length > 0 ? (
    <>
      {Object.values(DATE_GROUPS).map((dateGroup: string) => {
        let groupActivities = groupedActivitiesByDate[dateGroup]
        if (!groupActivities || groupActivities.length === 0) return null
        const dateStyle =
          dateGroup == DATE_GROUPS.TODAY || dateGroup == DATE_GROUPS.YESTERDAY
            ? undefined
            : 'medium'

        return (
          <div key={dateGroup}>
            <div
              className={
                'text-muted-foreground text-xs py-1 font-semibold sticky top-16 bg-white dark:bg-[#1b1917]'
              }
            >
              {t(`Groups.${dateGroup}`)}
            </div>
            {groupActivities.map((activity: Activity) => {
              const participant =
                activity.participantId !== null
                  ? participants.find((p) => p.id === activity.participantId)
                  : undefined
              const expense =
                activity.expenseId !== null
                  ? expenses.find((e) => e.id === activity.expenseId)
                  : undefined
              return (
                <ActivityItem
                  key={activity.id}
                  {...{ groupId, activity, participant, expense, dateStyle }}
                />
              )
            })}
          </div>
        )
      })}
    </>
  ) : (
    <p className="px-6 text-sm py-6">{t('noActivity')}</p>
  )
}
