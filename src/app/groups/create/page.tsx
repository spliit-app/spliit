import { CreateGroup } from '@/app/groups/create/create-group'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata() {
  const t = await getTranslations('Groups')

  return {
    title: t('NoRecent.create'),
  };
}

export default function CreateGroupPage() {
  return <CreateGroup />
}
