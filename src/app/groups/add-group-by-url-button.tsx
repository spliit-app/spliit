import { saveRecentGroup } from '@/app/groups/recent-groups-helpers'
import { QrCodeScanner } from '@/components/qr-code-scanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useMediaQuery } from '@/lib/hooks'
import { trpc } from '@/trpc/client'
import { Loader2, Plus, QrCode, Link as LinkIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

type Props = {
  reload: () => void
}

export function AddGroupByUrlButton({ reload }: Props) {
  const t = useTranslations('Groups.AddByURL')
  const isDesktop = useMediaQuery('(min-width: 640px)')
  const [url, setUrl] = useState('')
  const [error, setError] = useState(false)
  const [scanError, setScanError] = useState('')
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [scanMode, setScanMode] = useState(false)
  const utils = trpc.useUtils()

  const processUrl = async (urlToProcess: string) => {
    const [, groupId] =
      urlToProcess.match(
        new RegExp(`${window.location.origin}/groups/([^/]+)`),
      ) ??
      urlToProcess.match(/\/groups\/([^/?]+)/) ?? // Also match relative URLs from QR
      []

    if (!groupId) {
      setError(true)
      setScanError('')
      setPending(false)
      return
    }

    setPending(true)
    try {
      const { group } = await utils.groups.get.fetch({
        groupId: groupId,
      })
      if (group) {
        saveRecentGroup({ id: group.id, name: group.name })
        reload()
        setUrl('')
        setOpen(false)
        setScanMode(false)
        setError(false)
        setScanError('')
      } else {
        setError(true)
        setScanError('')
      }
    } catch (err) {
      setError(true)
      setScanError('')
    } finally {
      setPending(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="secondary">{t('button')}</Button>
      </PopoverTrigger>
      <PopoverContent
        align={isDesktop ? 'end' : 'start'}
        className="[&_p]:text-sm flex flex-col gap-3"
      >
        <h3 className="font-bold">{t('title')}</h3>
        <p>{t('description')}</p>

        {!isDesktop && (
          <div className="flex gap-2 border-b pb-3 flex-wrap">
            <Button
              type="button"
              variant={!scanMode ? 'default' : 'outline'}
              size="sm"
              className="flex-1 min-w-[120px]"
              onClick={() => {
                setScanMode(false)
                setError(false)
                setScanError('')
              }}
            >
              <LinkIcon className="w-4 h-4 mr-2" />
              {t('urlMode')}
            </Button>
            <Button
              type="button"
              variant={scanMode ? 'default' : 'outline'}
              size="sm"
              className="flex-1 min-w-[120px]"
              onClick={() => {
                setScanMode(true)
                setError(false)
                setScanError('')
              }}
            >
              <QrCode className="w-4 h-4 mr-2" />
              {t('qrMode')}
            </Button>
          </div>
        )}

        {!scanMode ? (
          <form
            className="flex gap-2 flex-wrap"
            onSubmit={async (event) => {
              event.preventDefault()
              await processUrl(url)
            }}
          >
            <Input
              type="url"
              required
              placeholder="https://spliit.app/..."
              className="flex-1 min-w-[200px] text-base"
              value={url}
              disabled={pending}
              onChange={(event) => {
                setUrl(event.target.value)
                setError(false)
                setScanError('')
              }}
            />
            <Button size="icon" type="submit" disabled={pending} className="flex-shrink-0">
              {pending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </Button>
          </form>
        ) : (
          <QrCodeScanner
            onScan={(scannedUrl) => {
              processUrl(scannedUrl)
            }}
            onError={(errorMsg) => {
              setScanError(errorMsg)
              setError(false)
            }}
            onClose={() => setScanMode(false)}
          />
        )}

        {error && <p className="text-destructive">{t('error')}</p>}
        {scanError && <p className="text-destructive">{scanError}</p>}
      </PopoverContent>
    </Popover>
  )
}
