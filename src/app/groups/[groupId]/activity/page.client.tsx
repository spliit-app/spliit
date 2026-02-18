import { ActivityList } from '@/app/groups/[groupId]/activity/activity-list'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Metadata } from 'next'
import { useTranslations } from 'next-intl'

const t = useTranslations('Activity')

export const metadata: Metadata = {
  title: t('title'),
}

export function ActivityPageClient() {

  return (
    <>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col space-y-4">
          <ActivityList />
        </CardContent>
      </Card>
    </>
  )
}
