import { ActivityPageClient } from '@/app/groups/[groupId]/activity/page.client'
import { Metadata } from 'next'
import { useTranslations } from 'next-intl'

const t = useTranslations('Activity')

export const metadata: Metadata = {
  title: t('title'),
}

export default async function ActivityPage() {
  return <ActivityPageClient />
}
