import { RecentGroupList } from '@/app/groups/recent-group-list'
import { Metadata } from 'next'
import { useTranslations } from 'next-intl'

const t = useTranslations('Groups')

export const metadata: Metadata = {
  title: t('recent'),
}

export default async function GroupsPage() {
  return <RecentGroupList />
}
