import { CreateGroup } from '@/app/groups/create/create-group'
import { Metadata } from 'next'
import { useTranslations } from 'next-intl'

export async function generateMetadata() {
  const t = await useTranslations('Groups')

  return {
    title: t('NoRecent.create'),
  };
}

export default function CreateGroupPage() {
  return <CreateGroup />
}
