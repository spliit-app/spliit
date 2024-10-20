import GroupExpensesPageClient from '@/app/groups/[groupId]/expenses/page.client'
import { env } from '@/lib/env'
import { Metadata } from 'next'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Expenses',
}

export default async function GroupExpensesPage({
  params: { groupId },
}: {
  params: { groupId: string }
}) {
  return (
    <GroupExpensesPageClient
      groupId={groupId}
      enableReceiptExtract={env.NEXT_PUBLIC_ENABLE_RECEIPT_EXTRACT}
    />
  )
}
