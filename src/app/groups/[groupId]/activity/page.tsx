import { ActivityPageClient } from '@/app/groups/[groupId]/activity/page.client'
import { Metadata } from 'next'
import { useTranslations } from 'next-intl'

export async function generateMetadata() {
  const t = await useTranslations('Activity')

  return {
    title: t('title'),
  };
}

export default async function ActivityPage() {
  return <ActivityPageClient />
}
