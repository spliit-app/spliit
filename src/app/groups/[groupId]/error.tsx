'use client'

import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'

export default function GroupError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('Errors')
  return (
    <div className="py-10 text-center space-y-4">
      <h2 className="text-xl font-semibold">{t('groupTitle')}</h2>
      <p className="text-muted-foreground text-sm">{t('generic')}</p>
      <Button type="button" onClick={() => reset()}>
        {t('retry')}
      </Button>
    </div>
  )
}
