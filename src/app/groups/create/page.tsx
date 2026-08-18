import { CreateGroup } from '@/app/groups/create/create-group'
import { env } from '@/lib/env'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata() {
  const t = await getTranslations('Groups')

  return {
    title: t('createGroup'),
  }
}

export default function CreateGroupPage() {
  const defaultCurrencyCode =
    env.DEFAULT_CURRENCY_CODE ?? env.NEXT_PUBLIC_DEFAULT_CURRENCY_CODE ?? 'USD'
  return <CreateGroup defaultCurrencyCode={defaultCurrencyCode} />
}
