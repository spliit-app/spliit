'use client'

import { Button } from '@/components/ui/button'
import { getRecentGroups, saveRecentGroup } from '@/app/groups/recent-groups-helpers'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { trpc } from '@/trpc/client'
import { useToast } from '@/components/ui/use-toast'

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

    const storageKey = 'anonymousAssociatedGroups'
    const raw = localStorage.getItem(storageKey)
    const current = raw ? (JSON.parse(raw) as string[]) : []
    if (!current.includes(groupId)) {
      localStorage.setItem(storageKey, JSON.stringify([...current, groupId]))
    }
  }

  const syncAssociatedGroups = async (groupId: string, groupName: string) => {
    const linkedStatus = localStorage.getItem('anonymousLinked')
    if (linkedStatus !== 'true') return

    const authId = localStorage.getItem('anonymousAuthId')
    if (!authId) return

    const storageKey = 'anonymousAssociatedGroups'
    const raw = localStorage.getItem(storageKey)
    const current = raw ? (JSON.parse(raw) as string[]) : []
    const mergedIds = current.includes(groupId)
      ? current
      : [...current, groupId]

    const recentGroups = getRecentGroups()
    const recentMap = new Map(recentGroups.map((group) => [group.id, group.name]))
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
        setError(data.error || 'Failed to analyze JSON file')
        return
      }

      if (!data.comparison || !data.groupName) {
        setError('Invalid response from server')
        return
      }

      setAnalysis({
        result: data.comparison,
        groupName: data.groupName,
        warnings: data.warnings || [],
      })
    } catch (err) {
      setError('Failed to analyze JSON file')
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
        setError('Enter a valid URL from another Spliit site.')
        return
      }

      if (parsedUrl.origin === window.location.origin) {
        setError('Use a different site URL than this one.')
        return
      }

      const groupIdMatch = parsedUrl.pathname.match(/\/groups\/([^/]+)/)
      const groupId = groupIdMatch?.[1]
      if (!groupId) {
        setError('Could not find a group ID in that URL.')
        return
      }

      const existing = await utils.groups.get.fetch({ groupId })
      if (existing.group) {
        setError('That group already exists on this site.')
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
        setError(data.error || 'Failed to fetch JSON from the remote site.')
        return
      }

      const jsonText = JSON.stringify(data.jsonData)
      const nextFile = new File([jsonText], `Spliit Import - ${groupId}.json`, {
        type: 'application/json',
      })
      setFile(nextFile)
      setAnalysis(null)
      const summaryName = data.groupName
        ? `Ready to import: ${getImportedGroupName(data.groupName)}`
        : 'Remote JSON is ready to import.'
      setRemoteSummary(summaryName)
      await analyzeJSON(nextFile)
    } catch (err) {
      setError('Failed to fetch JSON from the remote site.')
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
        setError(data.error || 'Failed to import JSON')
        return
      }

      if (!data.groupId) {
        setError('Invalid response from server')
        return
      }

      const baseName = analysis?.groupName ?? 'Imported group'
      const groupName =
        analysis?.result.result === 'NOT_FOUND'
          ? getImportedGroupName(baseName)
          : baseName
      saveRecentGroup({ id: data.groupId, name: groupName })
      addGroupToAssociatedList(data.groupId)
      await syncAssociatedGroups(data.groupId, groupName)
      toast({
        title: t('importSuccessTitle'),
        description: t('importSuccessDescription', { name: groupName }),
      })

      // Redirect to the restored group
      router.push(`/groups/${data.groupId}`)
      router.refresh()
      setOpen(false)
    } catch (err) {
      setError('Failed to import JSON')
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
              Import from file
            </Button>
            <Button
              type="button"
              variant={importMode === 'url' ? 'default' : 'outline'}
              onClick={() => {
                setImportMode('url')
                setError(null)
              }}
            >
              Import from URL
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
                  placeholder="https://spliit.app/groups/..."
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
                    'Fetch JSON'
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
              onClick={analyzeJSON}
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
