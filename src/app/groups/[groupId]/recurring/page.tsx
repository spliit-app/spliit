import { RecurringPageClient } from '@/app/groups/[groupId]/recurring/page.client'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata() {
  const t = await getTranslations('Recurring')

  return {
    title: t('title'),
  }
}

export default async function RecurringPage() {
  return <RecurringPageClient />
}
