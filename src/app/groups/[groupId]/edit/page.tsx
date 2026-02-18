import { EditGroup } from '@/app/groups/[groupId]/edit/edit-group'
import { Metadata } from 'next'
import { useTranslations } from 'next-intl'

export async function generateMetadata() {
  const t = await useTranslations('Settings')

  return {
    title: t('title'),
  };
}

export default async function EditGroupPage() {
  return <EditGroup />
}
