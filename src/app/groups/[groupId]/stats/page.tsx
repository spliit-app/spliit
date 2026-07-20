import { TotalsPageClient } from '@/app/groups/[groupId]/stats/page.client'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata() {
  const t = await getTranslations('Stats')

  return {
    title: t('Totals.title'),
  }
}

export default async function TotalsPage() {
  return <TotalsPageClient />
}
