import GroupExpensesPageClient from '@/app/groups/[groupId]/expenses/page.client'
import { env } from '@/lib/env'
import { Metadata } from 'next'

// Render at request time rather than caching for an hour, so the flag below
// reflects the environment the container was started with.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Expenses',
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
