import { TotalsPageClient } from '@/app/groups/[groupId]/stats/page.client'
import { Metadata } from 'next'
import { useTranslations } from 'next-intl'

export async function generateMetadata() {
  const t = await useTranslations('Stats')

  return {
    title: t('Totals.title'),
  };
}

export default async function TotalsPage() {
  return <TotalsPageClient />
}
