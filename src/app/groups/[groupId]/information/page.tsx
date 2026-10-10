import GroupInformation from '@/app/groups/[groupId]/information/group-information'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata() {
  const t = await getTranslations('Information')

  return {
    title: t('title'),
  }
}

export default async function InformationPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params
  return <GroupInformation groupId={groupId} />
}
