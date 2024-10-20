import GroupExpensesPageClient from '@/app/groups/[groupId]/expenses/page.client'
import { env } from '@/lib/env'
import { Metadata } from 'next'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Expenses',
}

export default async function GroupExpensesPage() {
  return (
    <GroupExpensesPageClient
      enableReceiptExtract={env.NEXT_PUBLIC_ENABLE_RECEIPT_EXTRACT}
    />
  )
}
