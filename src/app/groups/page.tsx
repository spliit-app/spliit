import { RecentGroupList } from '@/app/groups/recent-group-list'
import { Metadata } from 'next'
import { useTranslations } from 'next-intl'

export async function generateMetadata() {
  const t = await useTranslations('Groups')

  return {
    title: t('recent'),
  };
}

export default async function GroupsPage() {
  return <RecentGroupList />
}
