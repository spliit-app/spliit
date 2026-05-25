'use client'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { ArrowRightLeft, Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

type SyncLine = {
  id: string
  entity: 'expense' | 'participant'
  kind: 'remote_only' | 'local_only' | 'conflict'
  title: string
  amount: number
  expenseDate: string
  differences?: Array<'category' | 'splitMode' | 'paidFor'>
  defaultDirection: 'remote_to_local' | 'local_to_remote'
  actions: {
    remote_to_local:
      | 'create_local'
      | 'update_local'
      | 'delete_local'
      | 'create_remote'
      | 'update_remote'
      | 'delete_remote'
    local_to_remote:
      | 'create_local'
      | 'update_local'
      | 'delete_local'
      | 'create_remote'
      | 'update_remote'
      | 'delete_remote'
  }
}

type SyncPreflightResponse = {
  success: boolean
  sourceUrl: string
  comparison: {
    result: 'NEWER' | 'OLDER' | 'SAME' | 'NOT_FOUND'
  }
  syncLines: SyncLine[]
  error?: string
}

function getLinePresence(kind: SyncLine['kind']) {
  switch (kind) {
    case 'remote_only':
      return {
        local: 'missing',
        remote: 'present',
      }
    case 'local_only':
      return {
        local: 'present',
        remote: 'missing',
      }
    case 'conflict':
      return {
        local: 'present',
        remote: 'present',
      }
  }
}

function formatGroupSourceUrl(urlString: string) {
  try {
    const parsed = new URL(urlString)
    const match = parsed.pathname.match(/\/groups\/([^/]+)/)
    const groupId = match?.[1]
    if (!groupId) return urlString
    return `${parsed.origin}/groups/${groupId}`
  } catch {
    return urlString
  }
}

export function GroupSyncDialog({
  groupId,
  enabled,
}: {
  groupId: string
  enabled: boolean
}) {
  const router = useRouter()
  const locale = useLocale()
  const toast = useToast()
  const t = useTranslations('Groups')
  const [open, setOpen] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncExecuting, setSyncExecuting] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncPreflight, setSyncPreflight] =
    useState<SyncPreflightResponse | null>(null)
  const [selectedLines, setSelectedLines] = useState<Record<string, boolean>>(
    {},
  )
  const [lineDirections, setLineDirections] = useState<
    Record<string, 'remote_to_local' | 'local_to_remote'>
  >({})

  const selectedLinePayload = useMemo(
    () =>
      Object.entries(selectedLines)
        .filter(([, selected]) => selected)
        .map(([lineId]) => ({
          lineId,
          direction: lineDirections[lineId] ?? 'remote_to_local',
        })),
    [lineDirections, selectedLines],
  )
  const hasSelectedSyncItems = selectedLinePayload.length > 0
  const userSyncLines =
    syncPreflight?.syncLines.filter((line) => line.entity === 'participant') ??
    []
  const expenseSyncLines =
    syncPreflight?.syncLines.filter((line) => line.entity === 'expense') ?? []

  const openSyncDialog = async () => {
    if (!enabled) return
    setOpen(true)
    setSyncLoading(true)
    setSyncError(null)
    setSyncPreflight(null)
    setSelectedLines({})
    setLineDirections({})

    try {
      const response = await fetch(`/api/groups/${groupId}/expenses/sync`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'preflight' }),
      })

      const data = (await response.json()) as SyncPreflightResponse
      if (!response.ok || !data.success) {
        setSyncError(t('Sync.errorPrepare'))
        return
      }

      setSyncPreflight(data)
      setSelectedLines(
        Object.fromEntries(data.syncLines.map((line) => [line.id, true])),
      )
      setLineDirections(
        Object.fromEntries(
          data.syncLines.map((line) => [line.id, line.defaultDirection]),
        ),
      )
    } catch {
      setSyncError(t('Sync.errorPrepare'))
    } finally {
      setSyncLoading(false)
    }
  }

  const executeSync = async () => {
    setSyncExecuting(true)
    setSyncError(null)

    try {
      const response = await fetch(`/api/groups/${groupId}/expenses/sync`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'execute',
          selectedLines: selectedLinePayload,
        }),
      })

      const data = (await response.json()) as {
        success?: boolean
        error?: string
      }

      if (!response.ok || !data.success) {
        setSyncError(t('Sync.errorExecute'))
        return
      }

      toast.toast({
        title: t('Sync.toastTitle'),
        description: t('Sync.toastDescription'),
      })
      setOpen(false)
      router.refresh()
    } catch {
      setSyncError(t('Sync.errorExecute'))
    } finally {
      setSyncExecuting(false)
    }
  }

  const renderSyncLine = (line: SyncLine) => {
    const direction = lineDirections[line.id] ?? line.defaultDirection
    const action = line.actions[direction]
    const presence = getLinePresence(line.kind)

    const actionLabel =
      action === 'create_local'
        ? line.entity === 'participant'
          ? t('Sync.Actions.createLocalUser')
          : t('Sync.Actions.createLocalExpense')
        : action === 'create_remote'
          ? line.entity === 'participant'
            ? t('Sync.Actions.createRemoteUser')
            : t('Sync.Actions.createRemoteExpense')
          : action === 'update_local'
            ? t('Sync.Actions.updateLocalExpense')
            : action === 'update_remote'
              ? t('Sync.Actions.updateRemoteExpense')
              : action === 'delete_local'
                ? line.entity === 'participant'
                  ? t('Sync.Actions.deleteLocalUser')
                  : t('Sync.Actions.deleteLocalExpense')
                : line.entity === 'participant'
                  ? t('Sync.Actions.deleteRemoteUser')
                  : t('Sync.Actions.deleteRemoteExpense')

    return (
      <div key={line.id} className="rounded-md border p-2 text-sm space-y-2">
        <div className="flex items-start gap-2">
          <Checkbox
            checked={!!selectedLines[line.id]}
            onCheckedChange={(checked) => {
              setSelectedLines((prev) => ({
                ...prev,
                [line.id]: checked === true,
              }))
            }}
          />
          <div className="flex-1">
            <div className="font-medium">{line.title}</div>
            <div className="text-muted-foreground">
              {line.entity === 'participant'
                ? t('Sync.user')
                : t('Sync.expenseWithDate', {
                    date: new Date(line.expenseDate).toLocaleDateString(locale),
                  })}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {t('Sync.presence', {
                local: t(`Sync.Presence.${presence.local}`),
                remote: t(`Sync.Presence.${presence.remote}`),
              })}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{actionLabel}</span>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => {
              setLineDirections((prev) => ({
                ...prev,
                [line.id]:
                  (prev[line.id] ?? line.defaultDirection) === 'remote_to_local'
                    ? 'local_to_remote'
                    : 'remote_to_local',
              }))
            }}
          >
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            {direction === 'remote_to_local'
              ? t('Sync.remoteToLocal')
              : t('Sync.localToRemote')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => void openSyncDialog()}
        disabled={!enabled}
      >
        {t('Sync.menuItem')}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{t('Sync.dialogTitle')}</DialogTitle>
            <DialogDescription>{t('Sync.dialogDescription')}</DialogDescription>
          </DialogHeader>

          {syncLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('Sync.loading')}
            </div>
          )}

          {syncError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {syncError}
            </div>
          )}

          {syncPreflight && !syncLoading && (
            <div className="space-y-4">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200 space-y-1">
                <div>
                  {t('Sync.remoteSource', {
                    url: formatGroupSourceUrl(syncPreflight.sourceUrl),
                  })}
                </div>
                <div> </div>
                <div>{t('Sync.directionHelp')}</div>
              </div>

              {syncPreflight.syncLines.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">
                    {t('Sync.usersSection')}
                  </div>
                  {userSyncLines.length > 0 ? (
                    <div className="max-h-[200px] overflow-auto space-y-2 pr-1">
                      {userSyncLines.map((line) => renderSyncLine(line))}
                    </div>
                  ) : (
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                      {t('Sync.noUserChanges')}
                    </div>
                  )}

                  <div className="text-sm font-medium mt-4">
                    {t('Sync.expensesSection')}
                  </div>
                  {expenseSyncLines.length > 0 ? (
                    <div className="max-h-[260px] overflow-auto space-y-2 pr-1">
                      {expenseSyncLines.map((line) => renderSyncLine(line))}
                    </div>
                  ) : (
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                      {t('Sync.noExpenseChanges')}
                    </div>
                  )}
                </div>
              )}

              {syncPreflight.syncLines.length === 0 && (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                  {t('Sync.nothingToSync')}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={syncExecuting}
                >
                  {t('Sync.cancel')}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    void executeSync()
                  }}
                  disabled={syncExecuting || !hasSelectedSyncItems}
                >
                  {syncExecuting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('Sync.syncing')}
                    </>
                  ) : (
                    t('Sync.syncNow')
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
