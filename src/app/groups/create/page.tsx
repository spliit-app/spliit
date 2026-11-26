import { CreateGroup } from '@/app/groups/create/create-group'
import { getSession } from '@/lib/auth-server'
import { env } from '@/lib/env'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata() {
  const t = await getTranslations('Groups')

  return {
    title: t('createGroup'),
  }
}

export default async function CreateGroupPage() {
  const defaultCurrencyCode =
    env.DEFAULT_CURRENCY_CODE ?? env.NEXT_PUBLIC_DEFAULT_CURRENCY_CODE ?? 'USD'

  // The creator is almost always a participant in their own group, and the form
  // used to make them retype their name and email every time. Passing the
  // account down lets the first row be filled in and linked already.
  const session = await getSession()

  return (
    <CreateGroup
      defaultCurrencyCode={defaultCurrencyCode}
      currentUser={
        session
          ? { name: session.user.name, email: session.user.email }
          : undefined
      }
    />
  )
}
