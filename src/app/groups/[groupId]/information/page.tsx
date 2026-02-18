import GroupInformation from '@/app/groups/[groupId]/information/group-information'
import { Metadata } from 'next'
import { useTranslations } from 'next-intl'

const t = useTranslations('GroupForm')

export const metadata: Metadata = {
  title: t('title'),
}

export default async function InformationPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params
  return <GroupInformation groupId={groupId} />
}
