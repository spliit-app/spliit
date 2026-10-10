import GroupExpensesPageClient from '@/app/groups/[groupId]/expenses/page.client'
import { env } from '@/lib/env'
import { getTranslations } from 'next-intl/server'

// Render at request time rather than caching for an hour, so the flag below
// reflects the environment the container was started with.
export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getTranslations('Expenses')

  return {
    title: t('title'),
  }
}

export default async function GroupExpensesPage() {
  return (
    <GroupExpensesPageClient
      enableReceiptExtract={
        env.ENABLE_RECEIPT_EXTRACT || env.NEXT_PUBLIC_ENABLE_RECEIPT_EXTRACT
      }
    />
  )
}
