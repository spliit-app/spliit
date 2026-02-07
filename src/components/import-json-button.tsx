'use client'

import {
  getRecentGroups,
  saveRecentGroup,
} from '@/app/groups/recent-groups-helpers'
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
import { useToast } from '@/components/ui/use-toast'
import { ASSOCIATED_GROUPS_KEY } from '@/lib/anonymous-constants'
import { trpc } from '@/trpc/client'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type AnalysisResult = {
  result: 'NEWER' | 'OLDER' | 'SAME' | 'NOT_FOUND'
  existingGroupUpdatedAt?: string
  jsonExportedAt: string
  differences?: {
    addedExpenses: number
    removedExpenses: number
    modifiedExpenses: number
    addedParticipants: number
    removedParticipants: number
  }
}

export function ImportJSONButton({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
} = {}) {
  const t = useTranslations('JSONImport')
  const router = useRouter()
  const { toast } = useToast()
  const utils = trpc.useUtils()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = controlledOnOpenChange || setInternalOpen
  const [file, setFile] = useState<File | null>(null)
  const [importMode, setImportMode] = useState<'file' | 'url'>('file')
  const [remoteUrl, setRemoteUrl] = useState('')
  const [remoteLoading, setRemoteLoading] = useState(false)
  const [remoteSummary, setRemoteSummary] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [analysis, setAnalysis] = useState<{
    result: AnalysisResult
    groupName: string
    warnings: string[]
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const getImportedGroupName = (name: string) => {
    const importDate = new Date().toISOString().split('T')[0]
    return `${name} (imported ${importDate})`
  }

  const addGroupToAssociatedList = (groupId: string) => {
    const linkedStatus = localStorage.getItem('anonymousLinked')
    if (linkedStatus !== 'true') return

    const raw = localStorage.getItem(ASSOCIATED_GROUPS_KEY)
    const current = raw ? (JSON.parse(raw) as string[]) : []
    if (!current.includes(groupId)) {
      localStorage.setItem(
        ASSOCIATED_GROUPS_KEY,
        JSON.stringify([...current, groupId]),
      )
    }
  }

  const syncAssociatedGroups = async (groupId: string, groupName: string) => {
    const linkedStatus = localStorage.getItem('anonymousLinked')
    if (linkedStatus !== 'true') return

    const authId = localStorage.getItem('anonymousAuthId')
    if (!authId) return

    const raw = localStorage.getItem(ASSOCIATED_GROUPS_KEY)
    const current = raw ? (JSON.parse(raw) as string[]) : []
    const mergedIds = current.includes(groupId)
      ? current
      : [...current, groupId]

    const recentGroups = getRecentGroups()
    const recentMap = new Map(
      recentGroups.map((group) => [group.id, group.name]),
    )
    recentMap.set(groupId, groupName)

    const payload = mergedIds.map((id) => ({
      groupId: id,
      groupName: recentMap.get(id) ?? id,
    }))

    const response = await fetch('/api/anonymous-users/groups', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id: authId, groups: payload }),
    })

    if (!response.ok) {
      toast({
        title: t('importAssociationWarningTitle'),
        description: t('importAssociationWarningDescription'),
        variant: 'destructive',
      })
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setAnalysis(null)
      setError(null)
      setRemoteSummary(null)
    }
  }

  const analyzeJSON = async (targetFile?: File | null) => {
    const fileToAnalyze = targetFile ?? file
    if (!fileToAnalyze) return

    setAnalyzing(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', fileToAnalyze)
      formData.append('action', 'analyze')

      const response = await fetch('/groups/json/import', {
        method: 'POST',
        body: formData,
      })

      const data = (await response.json()) as {
        success?: boolean
        comparison?: AnalysisResult
        groupName?: string
        warnings?: string[]
        error?: string
      }

      if (!response.ok) {
        setError(data.error || t('errorAnalysisFailed'))
        return
      }

      if (!data.comparison || !data.groupName) {
        setError(t('errorInvalidResponse'))
        return
      }

      setAnalysis({
        result: data.comparison,
        groupName: data.groupName,
        warnings: data.warnings || [],
      })
    } catch (err) {
      setError(t('errorAnalysisFailed'))
    } finally {
      setAnalyzing(false)
    }
  }

  const fetchRemoteJSON = async () => {
    if (!remoteUrl.trim()) return

    setRemoteLoading(true)
    setError(null)
    setRemoteSummary(null)

    try {
      let parsedUrl: URL
      try {
        parsedUrl = new URL(remoteUrl.trim())
      } catch (parseError) {
        setError(t('errorInvalidURL'))
        return
      }

      if (parsedUrl.origin === window.location.origin) {
        setError(t('errorSameOrigin'))
        return
      }

      const groupIdMatch = parsedUrl.pathname.match(/\/groups\/([^/]+)/)
      const groupId = groupIdMatch?.[1]
      if (!groupId) {
        setError(t('errorNoGroupID'))
        return
      }

      const existing = await utils.groups.get.fetch({ groupId })
      if (existing.group) {
        setError(t('errorGroupExists'))
        return
      }

      const response = await fetch('/groups/json/import/remote', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: parsedUrl.toString() }),
      })

      const data = (await response.json()) as {
        jsonData?: unknown
        groupName?: string
        error?: string
      }

      if (!response.ok || !data.jsonData) {
        setError(data.error || t('errorRemoteFetch'))
        return
      }

      const jsonText = JSON.stringify(data.jsonData)
      const nextFile = new File([jsonText], `Spliit Import - ${groupId}.json`, {
        type: 'application/json',
      })
      setFile(nextFile)
      setAnalysis(null)
      const summaryName = data.groupName
        ? t('remoteReadyWithName', {
            name: getImportedGroupName(data.groupName),
          })
        : t('remoteReady')
      setRemoteSummary(summaryName)
      await analyzeJSON(nextFile)
    } catch (err) {
      console.error('Failed to fetch JSON from remote site:', err)
      setError(t('errorRemoteFetch'))
    } finally {
      setRemoteLoading(false)
    }
  }

  const handleRestore = async (action: 'restore' | 'rollback') => {
    if (!file) return

    setRestoring(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('action', action)

      const response = await fetch('/groups/json/import', {
        method: 'POST',
        body: formData,
      })

      const data = (await response.json()) as {
        success?: boolean
        groupId?: string
        error?: string
        mode?: string
        message?: string
      }

      if (!response.ok) {
        setError(data.error || t('errorImportFailed'))
        return
      }

      if (!data.groupId) {
        setError(t('errorInvalidResponse'))
        return
      }

      const baseName = analysis?.groupName ?? 'Imported group'
      const groupName =
        analysis?.result.result === 'NOT_FOUND'
          ? getImportedGroupName(baseName)
          : baseName
      saveRecentGroup({ id: data.groupId, name: groupName })
      addGroupToAssociatedList(data.groupId)

      // Attempt to sync associated groups, but don't fail the import if this fails
      try {
        await syncAssociatedGroups(data.groupId, groupName)
      } catch (syncError) {
        console.error('Failed to sync associated groups:', syncError)
        // Continue with success flow even if sync fails
      }

      toast({
        title: t('importSuccessTitle'),
        description: t('importSuccessDescription', { name: groupName }),
      })

      // Redirect to the restored group
      router.push(`/groups/${data.groupId}`)
      router.refresh()
      setOpen(false)
    } catch (err) {
      setError(t('errorImportFailed'))
    } finally {
      setRestoring(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('importJSONTitle')}</DialogTitle>
          <DialogDescription>{t('importJSONDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={importMode === 'file' ? 'default' : 'outline'}
              onClick={() => {
                setImportMode('file')
                setError(null)
              }}
            >
              {t('importFromFile')}
            </Button>
            <Button
              type="button"
              variant={importMode === 'url' ? 'default' : 'outline'}
              onClick={() => {
                setImportMode('url')
                setError(null)
              }}
            >
              {t('importFromURL')}
            </Button>
          </div>

          <div className="space-y-2">
            {importMode === 'file' ? (
              <Input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                disabled={analyzing || restoring}
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                <Input
                  type="url"
                  placeholder={t('urlPlaceholder')}
                  value={remoteUrl}
                  onChange={(event) => {
                    setRemoteUrl(event.target.value)
                    setError(null)
                  }}
                  disabled={remoteLoading || analyzing || restoring}
                  className="flex-1 min-w-[240px]"
                />
                <Button
                  type="button"
                  onClick={fetchRemoteJSON}
                  disabled={remoteLoading || analyzing || restoring}
                >
                  {remoteLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    t('fetchJSON')
                  )}
                </Button>
              </div>
            )}
            {remoteSummary && (
              <p className="text-sm text-muted-foreground">{remoteSummary}</p>
            )}
          </div>

          {file && !analysis && (
            <Button
              onClick={() => analyzeJSON()}
              disabled={analyzing}
              className="w-full"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('analyzing')}
                </>
              ) : (
                t('analyzeJSON')
              )}
            </Button>
          )}

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
              {error}
            </div>
          )}

          {analysis && (
            <div className="space-y-4">
              {/* Warnings section */}
              {analysis.warnings.length > 0 && (
                <div className="p-3 bg-amber-50 rounded-md border border-amber-200">
                  <div className="flex gap-2 items-start">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800 space-y-1">
                      <div className="font-medium">{t('limitations')}</div>
                      <ul className="list-disc list-inside pl-2 space-y-0.5">
                        {analysis.warnings.slice(1).map((warning, idx) => (
                          <li key={idx}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 bg-slate-50 rounded-md space-y-2">
                <div className="font-medium">
                  {t('groupName')}:{' '}
                  {analysis.result.result === 'NOT_FOUND'
                    ? getImportedGroupName(analysis.groupName)
                    : analysis.groupName}
                </div>
                <div className="text-sm text-slate-600">
                  {t('exportDate')}:{' '}
                  {formatDate(analysis.result.jsonExportedAt)}
                </div>
              </div>

              {analysis.result.result === 'NOT_FOUND' && (
                <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                  <p className="text-sm text-blue-800">{t('groupNotFound')}</p>
                  <Button
                    onClick={() => handleRestore('restore')}
                    disabled={restoring}
                    className="mt-3 w-full"
                  >
                    {restoring ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('creating')}
                      </>
                    ) : (
                      t('createGroup')
                    )}
                  </Button>
                </div>
              )}

              {analysis.result.result === 'NEWER' && (
                <div className="p-3 bg-green-50 rounded-md border border-green-200 space-y-3">
                  <p className="text-sm text-green-800">{t('jsonIsNewer')}</p>
                  <div className="text-sm text-slate-600">
                    {t('currentVersion')}:{' '}
                    {formatDate(analysis.result.existingGroupUpdatedAt!)}
                  </div>
                  {analysis.result.differences && (
                    <div className="text-sm space-y-1">
                      <div>{t('changes')}:</div>
                      <ul className="list-disc list-inside pl-2">
                        {analysis.result.differences.addedExpenses > 0 && (
                          <li>
                            {t('addedExpenses', {
                              count: analysis.result.differences.addedExpenses,
                            })}
                          </li>
                        )}
                        {analysis.result.differences.addedParticipants > 0 && (
                          <li>
                            {t('addedParticipants', {
                              count:
                                analysis.result.differences.addedParticipants,
                            })}
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                  <Button
                    onClick={() => handleRestore('restore')}
                    disabled={restoring}
                    className="w-full"
                  >
                    {restoring ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('restoring')}
                      </>
                    ) : (
                      t('importDifferences')
                    )}
                  </Button>
                </div>
              )}

              {analysis.result.result === 'OLDER' && (
                <div className="p-3 bg-yellow-50 rounded-md border border-yellow-200 space-y-3">
                  <p className="text-sm text-yellow-800">{t('jsonIsOlder')}</p>
                  <div className="text-sm text-slate-600">
                    {t('currentVersion')}:{' '}
                    {formatDate(analysis.result.existingGroupUpdatedAt!)}
                  </div>
                  <Button
                    onClick={() => handleRestore('rollback')}
                    disabled={restoring}
                    variant="destructive"
                    className="w-full"
                  >
                    {restoring ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('rollingBack')}
                      </>
                    ) : (
                      t('rollbackToJSON')
                    )}
                  </Button>
                  <p className="text-xs text-slate-500">
                    {t('rollbackWarning')}
                  </p>
                </div>
              )}

              {analysis.result.result === 'SAME' && (
                <div className="p-3 bg-slate-50 rounded-md border border-slate-200">
                  <p className="text-sm text-slate-600">{t('jsonIsSame')}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t('cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
