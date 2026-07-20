import { ActivityPageClient } from '@/app/groups/[groupId]/activity/page.client'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata() {
  const t = await getTranslations('Activity')

  return {
    title: t('title'),
  }
}

export default async function ActivityPage() {
  return <ActivityPageClient />
}
