import GroupExpensesPageClient from '@/app/groups/[groupId]/expenses/page.client'
import { env } from '@/lib/env'
import { getTranslations } from 'next-intl/server'

export const revalidate = 3600

export async function generateMetadata() {
  const t = await getTranslations('Expenses')

  return {
    title: t('title'),
  };
}

export default async function GroupExpensesPage() {
  return (
    <GroupExpensesPageClient
      enableReceiptExtract={env.NEXT_PUBLIC_ENABLE_RECEIPT_EXTRACT}
    />
  )
}
