import BalancesAndReimbursements from '@/app/groups/[groupId]/balances/balances-and-reimbursements'
import { Metadata } from 'next'
import { useTranslations } from 'next-intl'

const t = useTranslations('Balances')

export const metadata: Metadata = {
  title: t('title'),
}

export default async function GroupPage() {
  return <BalancesAndReimbursements />
}
