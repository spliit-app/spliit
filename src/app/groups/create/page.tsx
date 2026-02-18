import { CreateGroup } from '@/app/groups/create/create-group'
import { Metadata } from 'next'
import { useTranslations } from 'next-intl'

const t = useTranslations('Groups')

export const metadata: Metadata = {
  title: t('NoRecent.create'),
}

export default function CreateGroupPage() {
  return <CreateGroup />
}
