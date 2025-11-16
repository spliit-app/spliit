'use client'

// File import modal used from the Groups overview.
// It provides:
//  - Upload + drag/drop area for a Spliit JSON export
//  - Preview (detected format, totals, warnings)
//  - Scroll-to-confirm gate before import
//  - Chunked import with a progress bar
//  - Cancel deletes the created group and any imported expenses
//  - Finalize returns the new group id/name to the caller for navigation

import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'

import { ImportAnalysisPanel } from '@/components/import/import-analysis-panel'
import { UploadDropzone } from '@/components/import/upload-dropzone'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { type ImportBuildResult } from '@/lib/imports/file-import'
import { trpc } from '@/trpc/client'
import { Loader2, Upload } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Input } from './ui/input'

type UploadState = {
  csv: string
  fileName: string | null
}

// The server advances progress in ~10% increments per call.

// Minimal shape of the result state used by the UI.
type ImportResultState = null | {
  status: 'completed' | 'cancelled'
  created: number
  total: number
  resultId: string
}

export function FileImportModal({
  open: controlledOpen,
  onOpenChange,
  hideTrigger,
  onCreateSuccess,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideTrigger?: boolean
  onCreateSuccess?: (result: { groupId: string; groupName: string }) => void
}) {
  const t = useTranslations('FileImport')
  const tErrors = useTranslations('FileImportErrors')
  // i18n strings are provided via t(); formatting handled in subcomponents
  const [groupName, setGroupName] = useState('')
  const [dialogOpen, setDialogOpen] = useState(controlledOpen ?? false)
  const setOpen = onOpenChange ?? setDialogOpen
  const open = controlledOpen ?? dialogOpen
  const { toast } = useToast()
  const [uploadState, setUploadState] = useState<UploadState>({
    csv: '',
    fileName: null,
  })
  const [previewResult, setPreviewResult] = useState<ImportBuildResult | null>(
    null,
  )
  const [previewError, setPreviewError] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const [hasReachedBottom, setHasReachedBottom] = useState(false)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const cancelRequestedRef = useRef(false)
  const [isCancellingImport, setIsCancellingImport] = useState(false)
  const [importResult, setImportResult] = useState<ImportResultState>(null)
  const [resultActionLoading, setResultActionLoading] = useState(false)
  const [importProgress, setImportProgress] = useState<{
    processed: number
    total: number
  }>({
    processed: 0,
    total: 0,
  })

  const localizeErrorMessage = useCallback(
    (message: string) => {
      const normalized = message.toLowerCase()
      if (normalized.includes('no participants'))
        return tErrors('noParticipants')
      if (normalized.includes('uploaded file was empty'))
        return tErrors('fileEmpty')
      if (normalized.includes('invalid amount')) return tErrors('invalidAmount')
      if (normalized.includes('invalid expense date'))
        return tErrors('invalidDate')
      return message
    },
    [tErrors],
  )

  const utils = trpc.useUtils()

  // Step 1: Preview the uploaded file to show warnings and totals before importing.
  const previewMutation = trpc.groups.importFromFilePreview.useMutation({
    onSuccess(result) {
      setPreviewResult(result)
      setPreviewError(null)
      setIsProcessing(false)
    },
    onError(error) {
      setPreviewResult(null)
      setPreviewError(localizeErrorMessage(error.message))
      setIsProcessing(false)
    },
  })

  // Import job mutations (create a new group from file)
  const startCreateImportMutation =
    trpc.groups.importFromFileStartJob.useMutation({
      onError(error) {
        setIsProcessing(false)
        toast({
          title: t('errorTitle'),
          description: error.message,
          variant: 'destructive',
        })
      },
    })
  const runCreateImportChunkMutation =
    trpc.groups.importFromFileRunChunk.useMutation({
      onError(error) {
        setIsProcessing(false)
        toast({
          title: t('errorTitle'),
          description: error.message,
          variant: 'destructive',
        })
      },
    })
  const cancelCreateImportMutation =
    trpc.groups.importFromFileCancelJob.useMutation({
      onError(error) {
        setIsCancellingImport(false)
        toast({
          title: t('errorTitle'),
          description: error.message,
          variant: 'destructive',
        })
      },
    })
  const finalizeCreateImportMutation =
    trpc.groups.importFromFileFinalize.useMutation({
      onError(error) {
        toast({
          title: t('errorTitle'),
          description: error.message,
          variant: 'destructive',
        })
      },
    })

  const analyzeCsv = useCallback(
    (content: string) => {
      if (!content.trim()) {
        setPreviewResult(null)
        return
      }

      setPreviewResult(null)
      setPreviewError(null)
      setIsProcessing(true)
      previewMutation.mutate({
        fileContent: content,
        fileName: uploadState.fileName ?? undefined,
      })
    },
    [previewMutation, uploadState.fileName],
  )

  const handleFileRead = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const content = String(reader.result ?? '')
      setUploadState({ csv: content, fileName: file.name })
      analyzeCsv(content)
    }
    reader.onerror = () => {
      setPreviewError(localizeErrorMessage(t('fileReadError')))
    }
    reader.readAsText(file, 'utf-8')
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    handleFileRead(file)
    event.target.value = ''
  }

  const handleDropSelect = (file: File) => handleFileRead(file)

  const totalRows =
    (previewResult?.expenses.length ?? 0) + (previewResult?.errors.length ?? 0)
  const hasFatalErrors = (previewResult?.errors.length ?? 0) > 0
  const canImport = Boolean(previewResult) && !hasFatalErrors
  const jobRunning = Boolean(currentJobId)
  const importLoading =
    jobRunning ||
    startCreateImportMutation.status === 'pending' ||
    runCreateImportChunkMutation.status === 'pending' ||
    cancelCreateImportMutation.status === 'pending'

  // Keep a stable reference to the mutation reset function so the cleanup
  // effect can call it without triggering new renders when the mutation object
  // identity changes.
  const previewResetRef = useRef(previewMutation.reset)

  useEffect(() => {
    previewResetRef.current = previewMutation.reset
  }, [previewMutation.reset])

  useEffect(() => {
    if (!open) {
      setUploadState({ csv: '', fileName: null })
      setPreviewResult(null)
      setPreviewError(null)
      setHasReachedBottom(false)
      setImportProgress({ processed: 0, total: 0 })
      setIsProcessing(false)
      setCurrentJobId(null)
      cancelRequestedRef.current = false
      setIsCancellingImport(false)
      setImportResult(null)
      setGroupName('')
      previewResetRef.current()
    }
  }, [open])

  useEffect(() => {
    setHasReachedBottom(false)
  }, [previewResult])

  useEffect(() => {
    if (!previewResult) return
    if (!groupName && previewResult.group?.name) {
      setGroupName(previewResult.group.name)
    }
  }, [groupName, previewResult])

  // Participant matching is not part of this modal

  const handleStartImport = useCallback(async () => {
    if (!canImport || importLoading) return
    cancelRequestedRef.current = false
    setIsCancellingImport(false)
    setImportResult(null)
    setIsProcessing(true)
    try {
      const start = await startCreateImportMutation.mutateAsync({
        fileContent: uploadState.csv,
        groupName: groupName.trim() || undefined,
        fileName: uploadState.fileName ?? undefined,
      })
      setCurrentJobId(start.jobId)
      setImportProgress({ processed: 0, total: start.totalExpenses })

      let finalResult: ImportResultState = null
      while (!cancelRequestedRef.current) {
        const chunk = await runCreateImportChunkMutation.mutateAsync({
          jobId: start.jobId,
        })
        setImportProgress({ processed: chunk.processed, total: chunk.total })
        if (chunk.done && chunk.resultId) {
          finalResult = {
            status: 'completed',
            created: chunk.processed,
            total: chunk.total,
            resultId: chunk.resultId,
          }
          ;(finalResult as any).groupId = chunk.groupId
          ;(finalResult as any).groupName = chunk.groupName
          break
        }
      }

      if (cancelRequestedRef.current && !finalResult) {
        setIsCancellingImport(true)
        const cancel = await cancelCreateImportMutation.mutateAsync({
          jobId: start.jobId,
        })
        finalResult = {
          status: 'cancelled',
          created: cancel.processed,
          total: cancel.total,
          resultId: cancel.resultId,
        }
        ;(finalResult as any).groupId = cancel.groupId
        ;(finalResult as any).groupName = cancel.groupName
      }

      if (finalResult) {
        setImportResult(finalResult)
      }
    } catch (error) {
      if (error instanceof Error) {
        toast({
          title: t('errorTitle'),
          description: error.message,
          variant: 'destructive',
        })
      }
      setImportProgress({ processed: 0, total: 0 })
    } finally {
      cancelRequestedRef.current = false
      setCurrentJobId(null)
      setIsCancellingImport(false)
      setIsProcessing(false)
    }
  }, [
    canImport,
    importLoading,
    startCreateImportMutation,
    runCreateImportChunkMutation,
    cancelCreateImportMutation,
    uploadState.csv,
    uploadState.fileName,
    groupName,
    t,
    toast,
  ])

  const handleScroll = useCallback(() => {
    const element = scrollContainerRef.current
    if (!element) return
    const reachedBottom =
      element.scrollTop + element.clientHeight >= element.scrollHeight - 8
    setHasReachedBottom(reachedBottom)
  }, [])

  const handleCancelImport = useCallback(() => {
    if (!currentJobId) return
    cancelRequestedRef.current = true
    setIsCancellingImport(true)
  }, [currentJobId])

  // When cancel is requested (via X or button), we only set the cancel flag here.
  // The running import loop will notice it, finish the current chunk, then perform
  // a single cancel request to the server. This avoids race conditions where the
  // group gets deleted while a chunk is still creating expenses.
  const requestCancel = useCallback(() => {
    if (!currentJobId) return
    cancelRequestedRef.current = true
    setIsCancellingImport(true)
  }, [currentJobId])

  // Finalize/undo is not included here

  useEffect(() => {
    handleScroll()
  }, [handleScroll, previewResult, importProgress])

  useEffect(() => {
    const anyPending =
      previewMutation.status === 'pending' ||
      startCreateImportMutation.status === 'pending' ||
      runCreateImportChunkMutation.status === 'pending' ||
      cancelCreateImportMutation.status === 'pending'

    if (!anyPending) {
      setIsProcessing(false)
    }
  }, [
    previewMutation.status,
    startCreateImportMutation?.status,
    runCreateImportChunkMutation?.status,
    cancelCreateImportMutation?.status,
  ])

  const renderContent = () => {
    if (jobRunning) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 text-center">
          <div>
            <p className="text-lg font-semibold">{t('importProgressLabel')}</p>
            <p className="text-sm text-muted-foreground">
              {importProgress.processed}/{importProgress.total}
            </p>
          </div>
          <div className="w-full max-w-xl space-y-2">
            <div className="h-4 rounded-full bg-muted">
              <div
                className="h-4 rounded-full bg-primary transition-[width]"
                style={{
                  width: `${Math.min(
                    100,
                    (importProgress.processed /
                      Math.max(importProgress.total, 1)) *
                      100,
                  )}%`,
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground">{t('importing')}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancelImport}
            disabled={isCancellingImport}
          >
            {isCancellingImport ? t('importCanceling') : t('importCancel')}
          </Button>
        </div>
      )
    }

    if (importResult) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 text-center">
          <div>
            <p className="text-lg font-semibold">
              {importResult.status === 'completed'
                ? t('importResultCompleted', {
                    created: importResult.created,
                    total: importResult.total,
                  })
                : t('importResultCancelledSimple')}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {importResult.status === 'completed' && (
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  if (!importResult) return
                  setResultActionLoading(true)
                  try {
                    const r = await finalizeCreateImportMutation.mutateAsync({
                      resultId: importResult.resultId,
                    })
                    const groupId = (importResult as any).groupId || r.groupId
                    const groupName =
                      (importResult as any).groupName || r.groupName
                    onCreateSuccess?.({ groupId, groupName })
                    setOpen(false)
                  } catch (e) {
                    if (e instanceof Error) {
                      toast({
                        title: t('errorTitle'),
                        description: e.message,
                        variant: 'destructive',
                      })
                    }
                  } finally {
                    setResultActionLoading(false)
                  }
                }}
                disabled={resultActionLoading}
              >
                {t('importResultConfirm')}
              </Button>
            )}
            {importResult.status === 'cancelled' && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false)
                }}
              >
                {t('importResultConfirm')}
              </Button>
            )}
          </div>
        </div>
      )
    }

    // jobRunning branch above covers both existing and create flows

    return (
      <div className="space-y-4">
        <UploadDropzone
          inputId="file-import-upload"
          label={t('fileLabel')}
          title={uploadState.fileName ?? t('uploadDragTitle')}
          onSelect={handleDropSelect}
        />

        {previewResult && (
          <div className="space-y-2">
            <Label htmlFor="file-import-new-group-name">
              {t('newGroupNameLabel')}
            </Label>
            <Input
              id="file-import-new-group-name"
              value={groupName}
              placeholder={
                previewResult?.group?.name ?? t('newGroupNamePlaceholder')
              }
              onChange={(event) => setGroupName(event.target.value)}
            />
          </div>
        )}

        <ImportAnalysisPanel
          previewResult={previewResult}
          previewError={previewError}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleStartImport}
            disabled={importLoading || !canImport || !hasReachedBottom}
          >
            {importLoading ? t('importing') : t('import')}
          </Button>
        </div>
      </div>
    )
  }
  return (
    <Dialog
      open={open}
      // Clicking the built-in X should request cancel when a job is running; overlay/ESC are blocked separately.
      onOpenChange={(next) => {
        if (!next && jobRunning) {
          // Request cancel and keep the dialog open until the loop completes and shows the result.
          requestCancel()
          return
        }
        setOpen(next)
      }}
    >
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" title={t('buttonLabel')}>
            <Upload className="w-4 h-4" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent
        className="w-full max-w-4xl"
        onInteractOutside={(e) => {
          // Do not allow closing by clicking outside while a job runs
          if (jobRunning) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          // Block ESC close while importing; users should press the header X to cancel
          if (jobRunning) e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>
        <div className="relative">
          {previewMutation.status === 'pending' &&
            !jobRunning &&
            !importResult && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80">
                <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span>{t('processing')}</span>
                </div>
              </div>
            )}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="space-y-4 max-h-[70vh] overflow-y-scroll pr-3"
            style={{ scrollbarGutter: 'stable', padding: '5px' }}
          >
            {renderContent()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
