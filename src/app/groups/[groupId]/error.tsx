'use client'

import { ErrorState } from '@/components/error-state'
import { useTranslations } from 'next-intl'

export default function GroupError({
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
      title={t('groupTitle')}
      className="py-10"
    />
  )
}
