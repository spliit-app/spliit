import { cached } from '@/app/cached-functions'
import { ActivityList } from '@/app/groups/[groupId]/activity/activity-list'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getActivities, getGroupExpenses } from '@/lib/api'
import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Activity',
}

export default async function ActivityPage({
  params: { groupId },
}: {
  params: { groupId: string }
}) {
  const t = await getTranslations('Activity')
  const group = await cached.getGroup(groupId)
  if (!group) notFound()

  const expenses = await getGroupExpenses(groupId)
  const activities = await getActivities(groupId)

  return (
    <>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col space-y-4">
          <ActivityList
            {...{
              groupId,
              participants: group.participants,
              expenses,
              activities,
            }}
          />
        </CardContent>
      </Card>
    </>
  )
}
