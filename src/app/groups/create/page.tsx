import { CreateGroup } from '@/app/groups/create/create-group'
import { env } from '@/lib/env'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create Group',
}

export default function CreateGroupPage() {
  const defaultCurrencyCode =
    env.DEFAULT_CURRENCY_CODE ?? env.NEXT_PUBLIC_DEFAULT_CURRENCY_CODE ?? 'USD'
  return <CreateGroup defaultCurrencyCode={defaultCurrencyCode} />
}
