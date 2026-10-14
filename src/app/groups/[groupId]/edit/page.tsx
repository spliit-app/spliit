import { EditGroup } from '@/app/groups/[groupId]/edit/edit-group'
import { getRuntimeFeatureFlags } from '@/lib/featureFlags'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata() {
  const t = await getTranslations('Settings')

  return {
    title: t('title'),
  }
}

export default async function EditGroupPage() {
  return <EditGroup runtimeFeatureFlags={await getRuntimeFeatureFlags()} />
}
