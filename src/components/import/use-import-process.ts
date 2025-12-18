'use client'

import { useCallback, useRef, useState } from 'react'

import { useToast } from '@/components/ui/use-toast'
import {
  buildExpensesFromFileImport,
  type ImportBuildResult,
} from '@/lib/imports/file-import'
import { trpc } from '@/trpc/client'
import { useTranslations } from 'next-intl'

// Minimal shape of the result state used by the UI.
type ImportResultState = null | {
  status: 'completed' | 'cancelled'
  created: number
  total: number
  resultId: string
  groupId?: string
  groupName?: string
}

export type FileImportProcessState =
  | 'idle'
  | 'analyzing'
  | 'preview'
  | 'importing'
  | 'completed'
  | 'cancelled'
  | 'error'

export function useFileImportProcess(options?: {
  onImportSuccess?: (result: { groupId: string; groupName: string }) => void
  onClose?: () => void
}) {
  const t = useTranslations('FileImport')
  const tErrors = useTranslations('FileImportErrors')
  const { toast } = useToast()

  const [processState, setProcessState] =
    useState<FileImportProcessState>('idle')
  const [fileContent, setFileContent] = useState<string>('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [groupName, setGroupName] = useState<string>('')
  const [previewResult, setPreviewResult] = useState<ImportBuildResult | null>(
    null,
  )
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const cancelRequestedRef = useRef(false)
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
      if (normalized.includes('unsupported file format'))
        return tErrors('unsupportedFormat')
      return message
    },
    [tErrors],
  )

  const utils = trpc.useUtils()

  // Import job mutations (create a new group from file)
  const startCreateImportMutation =
    trpc.groups.importFromFileStartJob.useMutation({
      onError(error) {
        setProcessState('error')
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
        setProcessState('error')
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
        // If cancellation itself fails, report it but don't change state too much
        // as the job might still be in a weird state.
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

  const analyzeFile = useCallback(
    async (content: string, name: string | null) => {
      if (!content.trim()) {
        setPreviewResult(null)
        setPreviewError(null)
        setProcessState('idle')
        return
      }

      setFileContent(content)
      setFileName(name)
      setProcessState('analyzing')
      setPreviewResult(null)
      setPreviewError(null)

      try {
        const result = await buildExpensesFromFileImport(content)

        setPreviewResult(result)
        setProcessState('preview')
        if (result.group?.name) {
          setGroupName(result.group.name)
        }
      } catch (error) {
        setPreviewResult(null)
        const msg = error instanceof Error ? error.message : 'Analysis failed'
        setPreviewError(localizeErrorMessage(msg))
        setProcessState('error')
      }
    },
    [localizeErrorMessage],
  )

  const handleStartImport = useCallback(async () => {
    if (
      !fileContent ||
      !previewResult ||
      previewResult.errors.length > 0 ||
      processState !== 'preview'
    )
      return

    cancelRequestedRef.current = false
    setProcessState('importing')
    setImportResult(null) // Clear previous results

    try {
      const start = await startCreateImportMutation.mutateAsync({
        fileContent: fileContent,
        groupName: groupName.trim() || undefined,
        fileName: fileName ?? undefined,
      })
      setCurrentJobId(start.jobId)
      setImportProgress({ processed: 0, total: start.totalExpenses })

      let finalResult: ImportResultState = null
      while (!cancelRequestedRef.current) {
        const chunk = await runCreateImportChunkMutation.mutateAsync({
          jobId: start.jobId,
        })
        setImportProgress({ processed: chunk.processed, total: chunk.total })

        // If the chunk processing indicates completion, break the loop
        if (chunk.done && chunk.resultId) {
          finalResult = {
            status: 'completed',
            created: chunk.processed,
            total: chunk.total,
            resultId: chunk.resultId,
            groupId: chunk.groupId,
            groupName: chunk.groupName,
          }
          break
        }
        // If an error occurred during chunk processing, it will be caught by the mutation's onError
        // and set the processState to 'error', breaking this loop implicitly.
      }

      if (cancelRequestedRef.current && !finalResult && currentJobId) {
        // Only attempt to cancel if we have a currentJobId
        const cancel = await cancelCreateImportMutation.mutateAsync({
          jobId: currentJobId,
        })
        finalResult = {
          status: 'cancelled',
          created: cancel.processed,
          total: cancel.total,
          resultId: cancel.resultId,
          groupId: cancel.groupId,
          groupName: cancel.groupName,
        }
      }

      if (finalResult) {
        setImportResult(finalResult)
        setProcessState(finalResult.status) // Set 'completed' or 'cancelled'
        if (
          finalResult.status === 'completed' &&
          finalResult.groupId &&
          finalResult.groupName
        ) {
          options?.onImportSuccess?.({
            groupId: finalResult.groupId,
            groupName: finalResult.groupName,
          })
        }
      } else {
        // Fallback for cases where loop ends without finalResult (e.g., external error or implicit break)
        setProcessState('error')
      }
    } catch (error) {
      // Error will be handled by mutation's onError callback.
      // processState will already be 'error'.
      setImportProgress({ processed: 0, total: 0 })
    } finally {
      cancelRequestedRef.current = false
      setCurrentJobId(null) // Job is either done, cancelled or failed.
    }
  }, [
    fileContent,
    fileName,
    groupName,
    previewResult,
    processState,
    startCreateImportMutation,
    runCreateImportChunkMutation,
    cancelCreateImportMutation,
    options,
    currentJobId, // Include currentJobId to ensure consistent behavior in finalResult checks
  ])

  const requestCancel = useCallback(() => {
    // This function is called from the UI (e.g. closing the modal)
    // It signals the import loop to stop after the current chunk.
    if (currentJobId) {
      cancelRequestedRef.current = true
      // No state change here, the loop in handleStartImport will handle it after the chunk.
    }
  }, [currentJobId])

  const resetProcess = useCallback(() => {
    setProcessState('idle')
    setFileContent('')
    setFileName(null)
    setGroupName('')
    setPreviewResult(null)
    setPreviewError(null)
    setCurrentJobId(null)
    cancelRequestedRef.current = false
    setImportResult(null)
    setResultActionLoading(false)
    setImportProgress({ processed: 0, total: 0 })
    startCreateImportMutation.reset()
    runCreateImportChunkMutation.reset()
    cancelCreateImportMutation.reset()
    finalizeCreateImportMutation.reset()
  }, [
    startCreateImportMutation,
    runCreateImportChunkMutation,
    cancelCreateImportMutation,
    finalizeCreateImportMutation,
  ])

  const finalizeImport = useCallback(async () => {
    if (
      !importResult ||
      importResult.status !== 'completed' ||
      !importResult.resultId
    )
      return
    setResultActionLoading(true)
    try {
      await finalizeCreateImportMutation.mutateAsync({
        resultId: importResult.resultId,
      })
      // The modal might close, or reset to idle.
      options?.onClose?.() // Close the modal
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
      resetProcess()
    }
  }, [
    importResult,
    finalizeCreateImportMutation,
    options,
    toast,
    t,
    resetProcess,
  ])

  return {
    // State
    processState,
    fileContent,
    fileName,
    groupName,
    previewResult,
    previewError,
    importProgress,
    importResult,
    resultActionLoading,

    // Actions
    setGroupName,
    analyzeFile,
    startImport: handleStartImport,
    requestCancel, // Naming consistency for external consumers
    finalizeImport,
    resetProcess,
  }
}
