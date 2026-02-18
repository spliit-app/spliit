import BalancesAndReimbursements from '@/app/groups/[groupId]/balances/balances-and-reimbursements'
import { Metadata } from 'next'
import { useTranslations } from 'next-intl'

export async function generateMetadata() {
  const t = await useTranslations('Balances')

  return {
    title: t('title'),
  };
}

export default async function GroupPage() {
  return <BalancesAndReimbursements />
}
