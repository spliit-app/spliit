import { Members } from '@/app/groups/[groupId]/members/members'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata() {
  const t = await getTranslations('Members')

  return {
    title: t('title'),
  }
}

export default async function GroupMembersPage() {
  return <Members />
}
