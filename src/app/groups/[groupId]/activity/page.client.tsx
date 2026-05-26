import { ActivityList } from '@/app/groups/[groupId]/activity/activity-list'
import { Metadata } from 'next'
import { useTranslations } from 'next-intl'

export const metadata: Metadata = {
  title: 'Activity',
}

export function ActivityPageClient() {
  const t = useTranslations('Activity')

  return (
    <section className="mb-4 space-y-3">
      <div>
        <h2 className="text-lg font-semibold leading-7">{t('title')}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t('description')}
        </p>
      </div>
      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-col space-y-4">
          <ActivityList />
        </div>
      </div>
    </section>
  )
}
