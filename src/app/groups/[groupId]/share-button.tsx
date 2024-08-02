'use client'
import { CopyButton } from '@/components/copy-button'
import { ShareUrlButton } from '@/components/share-url-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useBaseUrl } from '@/lib/hooks'
import { Group } from '@prisma/client'
import { Share } from 'lucide-react'
import { useTranslations } from 'next-intl'

type Props = {
  group: Group
}

export function ShareButton({ group }: Props) {
  const t = useTranslations('Share')
  const baseUrl = useBaseUrl()
  const url = baseUrl && `${baseUrl}/groups/${group.id}/expenses?ref=share`

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button title={t('title')} size="icon" className="flex-shrink-0">
          <Share className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="[&_p]:text-sm flex flex-col gap-3">
        <p>{t('description')}</p>
        {url && (
          <div className="flex gap-2">
            <Input className="flex-1" defaultValue={url} readOnly />
            <CopyButton text={url} />
            <ShareUrlButton
              text={`Join my group ${group.name} on Spliit`}
              url={url}
            />
          </div>
        )}
        <p>
          <strong>{t('warning')}</strong> {t('warningHelp')}
        </p>
      </PopoverContent>
    </Popover>
  )
}
