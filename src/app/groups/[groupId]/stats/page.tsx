import { TotalsPageClient } from '@/app/groups/[groupId]/stats/page.client'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Totals',
}

export default async function TotalsPage() {
  return <TotalsPageClient />
}
