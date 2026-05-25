import { saveRecentGroup } from '@/app/groups/recent-groups-helpers'
import { ImportJSONButton } from '@/components/import-json-button'
import { QrCodeScanner } from '@/components/qr-code-scanner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useMediaQuery } from '@/lib/hooks'
import { trpc } from '@/trpc/client'
import { Link as LinkIcon, Loader2, Plus, QrCode } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

type Props = {
  reload: () => void
}

export function AddGroupByUrlButton({ reload }: Props) {
  const t = useTranslations('Groups.AddByURL')
  const isDesktop = useMediaQuery('(min-width: 640px)')
  const [url, setUrl] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [scanError, setScanError] = useState('')
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [scanMode, setScanMode] = useState(false)
  const [importUrl, setImportUrl] = useState<string | null>(null)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [hostMismatchOpen, setHostMismatchOpen] = useState(false)
  const [hostMismatchUrl, setHostMismatchUrl] = useState<string | null>(null)
  const [hostMismatchHost, setHostMismatchHost] = useState<string | null>(null)
  const [hostMismatchGroupId, setHostMismatchGroupId] = useState<string | null>(
    null,
  )
  const [hostMismatchGroupName, setHostMismatchGroupName] = useState<
    string | null
  >(null)
  const utils = trpc.useUtils()
  const placeholderUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/groups/...`
      : 'https://localhost/groups/...'

  const processUrl = async (urlToProcess: string) => {
    let parsedUrl: URL
    try {
      parsedUrl = new URL(urlToProcess, window.location.origin)
    } catch {
      setErrorMessage(t('error'))
      setScanError('')
      setImportUrl(null)
      setPending(false)
      return
    }

    const groupId = parsedUrl.pathname.match(/\/groups\/([^/?]+)/)?.[1]

    if (!groupId) {
      setErrorMessage(t('error'))
      setScanError('')
      setImportUrl(null)
      setPending(false)
      return
    }

    const isLocalHost = parsedUrl.origin === window.location.origin

    setPending(true)
    try {
      const { group } = await utils.groups.get.fetch({
        groupId: groupId,
      })

      if (!isLocalHost) {
        if (group) {
          setHostMismatchUrl(parsedUrl.toString())
          setHostMismatchHost(parsedUrl.origin)
          setHostMismatchGroupId(group.id)
          setHostMismatchGroupName(group.name)
          setHostMismatchOpen(true)
          return
        }

        setImportUrl(parsedUrl.toString())
        setErrorMessage(t('hostMismatchNotFound'))
        setScanError('')
        setShowImportDialog(true)
        return
      }

      if (group) {
        saveRecentGroup({ id: group.id, name: group.name })
        reload()
        setUrl('')
        setOpen(false)
        setScanMode(false)
        setErrorMessage(null)
        setScanError('')
        setImportUrl(null)
      } else {
        setErrorMessage(t('error'))
        setScanError('')
        setImportUrl(null)
      }
    } catch (err) {
      setErrorMessage(t('error'))
      setScanError('')
      setImportUrl(null)
    } finally {
      setPending(false)
    }
  }

  return (
    <>
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
                  setErrorMessage(null)
                  setScanError('')
                  setImportUrl(null)
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
                  setErrorMessage(null)
                  setScanError('')
                  setImportUrl(null)
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
                placeholder={placeholderUrl}
                className="flex-1 min-w-[200px] text-base"
                value={url}
                disabled={pending}
                onChange={(event) => {
                  setUrl(event.target.value)
                  setErrorMessage(null)
                  setScanError('')
                  setImportUrl(null)
                }}
              />
              <Button
                size="icon"
                type="submit"
                disabled={pending}
                className="flex-shrink-0"
              >
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
                setErrorMessage(null)
                setImportUrl(null)
              }}
              onClose={() => setScanMode(false)}
            />
          )}

          {errorMessage && (
            <div className="space-y-2">
              <p className="text-destructive">{errorMessage}</p>
              {importUrl && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setShowImportDialog(true)
                  }}
                >
                  {t('importFromUrlAction')}
                </Button>
              )}
            </div>
          )}
          {scanError && <p className="text-destructive">{scanError}</p>}
        </PopoverContent>
      </Popover>
      <ImportJSONButton
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        initialUrl={importUrl}
      />
      <Dialog open={hostMismatchOpen} onOpenChange={setHostMismatchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('hostMismatchTitle')}</DialogTitle>
            <DialogDescription>
              {t('hostMismatchPrompt', {
                host: hostMismatchHost ?? '',
                group: hostMismatchGroupName ?? '',
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setHostMismatchOpen(false)
              }}
            >
              {t('hostMismatchCancel')}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (hostMismatchUrl) {
                  window.location.href = hostMismatchUrl
                }
              }}
            >
              {t('hostMismatchRemoteAction')}
            </Button>
            <Button
              onClick={() => {
                if (hostMismatchGroupId && hostMismatchGroupName) {
                  saveRecentGroup({
                    id: hostMismatchGroupId,
                    name: hostMismatchGroupName,
                  })
                  reload()
                  setUrl('')
                  setOpen(false)
                  setScanMode(false)
                  setErrorMessage(null)
                  setScanError('')
                  setImportUrl(null)
                }
                setHostMismatchOpen(false)
              }}
            >
              {t('hostMismatchLocalAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
