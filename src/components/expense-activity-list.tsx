import {
  DATE_GROUPS,
  getGroupedActivitiesByDate,
} from '@/app/groups/[groupId]/activity/activity-list'
import { getActivities, getExpense, getGroup } from '@/lib/api'
import { Activity } from '@prisma/client'
import { ExpenseActivityItem } from './expense-activity-item'

type Props = {
  group: NonNullable<Awaited<ReturnType<typeof getGroup>>>
  expense: Awaited<ReturnType<typeof getExpense>>
  activities: NonNullable<Awaited<ReturnType<typeof getActivities>>>
}

export function ExpenseActivityList({ group, expense, activities }: Props) {
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
              {dateGroup}
            </div>
            {groupActivities.map((activity: Activity) => {
              const participant =
                activity.participantId !== null
                  ? group.participants.find(
                      (p) => p.id === activity.participantId,
                    )
                  : undefined
              return (
                <ExpenseActivityItem
                  key={activity.id}
                  {...{ group, activity, participant, expense, dateStyle }}
                />
              )
            })}
          </div>
        )
      })}
    </>
  ) : (
    <p className="px-6 text-sm py-6">
      There is not yet any activity for this expense.
    </p>
  )
}
