import { TotalsPageClient } from '@/app/groups/[groupId]/stats/page.client'
import { Metadata } from 'next'
import { useTranslations } from 'next-intl'

const t = useTranslations('Stats')

export const metadata: Metadata = {
  title: t('Totals.title'),
}

export default async function TotalsPage() {
  return <TotalsPageClient />
}
