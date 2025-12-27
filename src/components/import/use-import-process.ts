'use client'

import { useCallback, useRef, useState } from 'react'

import { useToast } from '@/components/ui/use-toast'
import {
  buildExpensesFromFileImport,
  type ImportBuildResult,
} from '@/lib/imports/file-import'
import { ExpenseFormValues } from '@/lib/schemas'
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

const BATCH_SIZE = 50
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

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

  // Ref to stop the loop
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

  // Mutations
  const createGroupMutation = trpc.groups.create.useMutation()
  const processBatchMutation = trpc.groups.importProcessBatch.useMutation()

  const analyzeFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: t('errorTitle'),
          description: t('fileTooLarge', { size: '10MB' }),
          variant: 'destructive',
        })
        return
      }

      setFileName(file.name)
      setProcessState('analyzing')
      setPreviewResult(null)
      setPreviewError(null)

      try {
        const content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result ?? ''))
          reader.onerror = () => reject(new Error('Failed to read file'))
          reader.readAsText(file, 'utf-8')
        })

        if (!content.trim()) {
          setPreviewResult(null)
          setPreviewError(null)
          setProcessState('idle')
          return
        }

        setFileContent(content)
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
    [localizeErrorMessage, t, toast],
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
    setImportResult(null)

    const totalExpenses = previewResult.expenses.length
    setImportProgress({ processed: 0, total: totalExpenses })

    try {
      // 1. Create Group
      let importParticipants = previewResult.group?.participants || []
      if (
        importParticipants.length === 0 &&
        previewResult.participants.length > 0
      ) {
        importParticipants = previewResult.participants.map((name) => ({
          id: name,
          name,
        }))
      }

      const finalGroupName =
        groupName.trim() || previewResult.group?.name || 'Imported Group'

      const createdGroup = await createGroupMutation.mutateAsync({
        groupFormValues: {
          name: finalGroupName,
          currency: previewResult.group?.currency || '$',
          currencyCode: previewResult.group?.currencyCode,
          participants: importParticipants.map((p) => ({ name: p.name })),
          information: `Imported from ${fileName || 'file'}`,
        },
      })

      const groupId = createdGroup.id
      const createdParticipants = createdGroup.participants

      // Create a map of ImportID -> RealID
      // We map by Name because createGroup creates them in order or we match by name.
      // Assuming unique names for simplicity in this context.
      const nameToRealId = new Map<string, string>()
      for (const p of createdParticipants) {
        nameToRealId.set(p.name, p.id)
      }

      const importIdToRealId = new Map<string, string>()
      for (const ip of importParticipants) {
        const realId = nameToRealId.get(ip.name)
        if (realId && ip.id) {
          importIdToRealId.set(ip.id, realId)
        }
      }

      // Helper to remap expense
      const remapExpense = (exp: ExpenseFormValues): ExpenseFormValues => ({
        ...exp,
        paidBy:
          importIdToRealId.get(exp.paidBy) ??
          nameToRealId.get(exp.paidBy) ??
          exp.paidBy,
        paidFor: exp.paidFor.map((pf) => ({
          ...pf,
          participant:
            importIdToRealId.get(pf.participant) ??
            nameToRealId.get(pf.participant) ??
            pf.participant,
        })),
      })

      // 2. Process Batches
      const expenses = previewResult.expenses
      let processedCount = 0

      for (let i = 0; i < expenses.length; i += BATCH_SIZE) {
        if (cancelRequestedRef.current) break

        const chunk = expenses.slice(i, i + BATCH_SIZE).map(remapExpense)

        await processBatchMutation.mutateAsync({
          groupId,
          expenses: chunk,
        })

        processedCount += chunk.length
        setImportProgress({ processed: processedCount, total: totalExpenses })
      }

      if (cancelRequestedRef.current) {
        // Cancelled
        setImportResult({
          status: 'cancelled',
          created: processedCount,
          total: totalExpenses,
          resultId: groupId, // Using groupId as resultId
          groupId,
          groupName: finalGroupName,
        })
        setProcessState('cancelled')
      } else {
        // Completed
        setImportResult({
          status: 'completed',
          created: processedCount,
          total: totalExpenses,
          resultId: groupId,
          groupId,
          groupName: finalGroupName,
        })
        setProcessState('completed')
        options?.onImportSuccess?.({ groupId, groupName: finalGroupName })
      }
    } catch (error) {
      console.error(error)
      setProcessState('error')
      toast({
        title: t('errorTitle'),
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    }
  }, [
    fileContent,
    fileName,
    groupName,
    previewResult,
    processState,
    createGroupMutation,
    processBatchMutation,
    options,
    toast,
    t,
  ])

  const requestCancel = useCallback(() => {
    cancelRequestedRef.current = true
  }, [])

  const resetProcess = useCallback(() => {
    setProcessState('idle')
    setFileContent('')
    setFileName(null)
    setGroupName('')
    setPreviewResult(null)
    setPreviewError(null)
    cancelRequestedRef.current = false
    setImportResult(null)
    setResultActionLoading(false)
    setImportProgress({ processed: 0, total: 0 })
  }, [])

  const finalizeImport = useCallback(async () => {
    // Just close the modal, as the import is already done client-side.
    options?.onClose?.()
  }, [options])

  return {
    processState,
    fileContent,
    fileName,
    groupName,
    previewResult,
    previewError,
    importProgress,
    importResult,
    resultActionLoading,

    setGroupName,
    analyzeFile,
    startImport: handleStartImport,
    requestCancel,
    finalizeImport,
    resetProcess,
  }
}
