import { EditGroup } from '@/app/groups/[groupId]/edit/edit-group'
import { Metadata } from 'next'
import { useTranslations } from 'next-intl'

const t = useTranslations('Settings')

export const metadata: Metadata = {
  title: t('title'),
}

export default async function EditGroupPage() {
  return <EditGroup />
}
