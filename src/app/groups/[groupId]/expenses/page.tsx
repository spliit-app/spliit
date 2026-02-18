import GroupExpensesPageClient from '@/app/groups/[groupId]/expenses/page.client'
import { env } from '@/lib/env'
import { Metadata } from 'next'
import { useTranslations } from 'next-intl'

export const revalidate = 3600

export async function generateMetadata() {
  const t = await useTranslations('Expenses')

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
