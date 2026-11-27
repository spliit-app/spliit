import { MonthlyPageClient } from '@/app/groups/[groupId]/monthly/page.client'
import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'

export async function generateMetadata() {
  const t = await getTranslations('Monthly')

  return {
    title: t('title'),
  }
}

export default async function MonthlyPage() {
  return (
    <Suspense>
      <MonthlyPageClient />
    </Suspense>
  )
}
