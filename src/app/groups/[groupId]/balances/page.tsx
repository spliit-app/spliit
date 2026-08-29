import BalancesAndReimbursements from '@/app/groups/[groupId]/balances/balances-and-reimbursements'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata() {
  const t = await getTranslations('Balances')

  return {
    title: t('title'),
  }
}

export default async function GroupPage() {
  return <BalancesAndReimbursements />
}
