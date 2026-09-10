'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { useEffect } from 'react'

function getDigest(error: unknown) {
  return typeof error === 'object' && error !== null && 'digest' in error
    ? String((error as { digest?: unknown }).digest ?? '')
    : ''
}

/**
 * Fallback rendered by the `error.tsx` boundaries. The exception message is
 * never displayed: only the opaque digest Next.js attaches to server errors is,
 * so a user can quote it in a bug report while the message stays in the logs.
 */
export function ErrorState({
  error,
  // `retry` refreshes the router before resetting the boundary; `reset` alone
  // re-renders the same failed payload, which would loop on server errors.
  retry,
  title,
  className,
}: {
  error: unknown
  retry: () => void
  title: string
  className?: string
}) {
  const t = useTranslations('Errors')
  const digest = getDigest(error)

  useEffect(() => {
    // Browser console only, so the details stay available while debugging.
    console.error(error)
  }, [error])

  return (
    <div className={cn('text-center space-y-4', className)}>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-muted-foreground text-sm">{t('generic')}</p>
      {digest && (
        <p className="text-muted-foreground text-xs font-mono">
          {t('reference', { digest })}
        </p>
      )}
      <Button type="button" onClick={retry}>
        {t('retry')}
      </Button>
    </div>
  )
}
