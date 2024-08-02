import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

export default function NotFound() {
  const t = useTranslations('Groups.NotFound')
  return (
    <div className="flex flex-col gap-2">
      <p>{t('text')}</p>
      <p>
        <Button asChild variant="secondary">
          <Link href="/groups">{t('link')}</Link>
        </Button>
      </p>
    </div>
  )
}
