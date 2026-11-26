import { AuthForm } from '@/components/auth-form'
import { getSession } from '@/lib/auth-server'
import { safeNextPath } from '@/lib/safe-redirect'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

export async function generateMetadata() {
  const t = await getTranslations('Auth')
  return { title: t('registerTitle') }
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  // Already signed in: this page has nothing to offer.
  if (await getSession()) {
    redirect(safeNextPath((await searchParams).next))
  }

  return (
    <Suspense>
      <AuthForm mode="register" />
    </Suspense>
  )
}
