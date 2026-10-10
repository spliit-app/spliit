'use client'

import { ErrorState } from '@/components/error-state'
import { useTranslations } from 'next-intl'

export default function Error({
  error,
  retry,
}: {
  error: unknown
  reset: () => void
  retry: () => void
}) {
  const t = useTranslations('Errors')
  return (
    <ErrorState
      error={error}
      retry={retry}
      title={t('title')}
      className="container max-w-lg py-16"
    />
  )
}
