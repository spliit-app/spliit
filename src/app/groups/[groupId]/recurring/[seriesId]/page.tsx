import { RecurringSeriesPageClient } from '@/app/groups/[groupId]/recurring/[seriesId]/page.client'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata() {
  const t = await getTranslations('Recurring')

  return {
    title: t('title'),
  }
}

export default async function RecurringSeriesPage({
  params,
}: {
  params: Promise<{ groupId: string; seriesId: string }>
}) {
  const { seriesId } = await params
  return <RecurringSeriesPageClient seriesId={seriesId} />
}
