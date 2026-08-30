'use client'

import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('Errors')
  return (
    <div className="container max-w-lg py-16 text-center space-y-4">
      <h2 className="text-xl font-semibold">{t('title')}</h2>
      <p className="text-muted-foreground text-sm">{t('generic')}</p>
      <Button type="button" onClick={() => reset()}>
        {t('retry')}
      </Button>
    </div>
  )
}
