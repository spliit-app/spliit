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
import { useFileImportProcess } from '@/components/import/use-import-process'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Upload } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Input } from './ui/input'

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

  const [dialogOpen, setDialogOpen] = useState(controlledOpen ?? false)
  const setOpen = onOpenChange ?? setDialogOpen
  const open = controlledOpen ?? dialogOpen

  const {
    processState,
    fileName,
    groupName,
    setGroupName,
    previewResult,
    previewError,
    importProgress,
    importResult,
    resultActionLoading,
    analyzeFile,
    startImport,
    requestCancel,
    finalizeImport,
    resetProcess,
  } = useFileImportProcess({
    onImportSuccess: onCreateSuccess,
    onClose: () => setOpen(false),
  })

  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const [hasReachedBottom, setHasReachedBottom] = useState(false)

  const handleFileRead = (file: File) => {
    analyzeFile(file)
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    handleFileRead(file)
    event.target.value = ''
  }

  const handleDropSelect = (file: File) => handleFileRead(file)

  const hasFatalErrors = (previewResult?.errors.length ?? 0) > 0
  const canImport = Boolean(previewResult) && !hasFatalErrors
  const jobRunning = processState === 'importing'
  const importLoading =
    processState === 'analyzing' || processState === 'importing'

  // Reset process when modal closes
  const prevOpenRef = useRef(open)
  useEffect(() => {
    if (prevOpenRef.current && !open) {
      resetProcess()
    }
    prevOpenRef.current = open
  }, [open, resetProcess])

  const handleScroll = useCallback(() => {
    const element = scrollContainerRef.current
    if (!element) return
    const reachedBottom =
      element.scrollTop + element.clientHeight >= element.scrollHeight - 8
    setHasReachedBottom(reachedBottom)
  }, [])

  useEffect(() => {
    handleScroll()
  }, [handleScroll, previewResult, importProgress])

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
            onClick={requestCancel}
            disabled={
              // This button is only shown if jobRunning (analyzing/importing) is true.
              // It should be enabled unless the import has already completed or been cancelled via other means (e.g., direct server call).
              // The hook handles the actual cancellation state.
              false
            }
          >
            {t('importCancel')}
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
                onClick={finalizeImport}
                disabled={resultActionLoading}
              >
                {t('importResultConfirm')}
              </Button>
            )}
            {importResult.status === 'cancelled' && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                {t('importResultConfirm')}
              </Button>
            )}
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <UploadDropzone
          inputId="file-import-upload"
          label={t('fileLabel')}
          title={fileName ?? t('uploadDragTitle')}
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
            onClick={startImport}
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
        if (next === open) return
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
          <DialogDescription
            id="file-import-dialog-description"
            className="sr-only"
          >
            {t('analysisExplanation')}
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
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
