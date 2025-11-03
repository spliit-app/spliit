'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { trpc } from '@/trpc/client'
import { Loader2, Upload, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

interface SplitwiseImportProps {
  groupId: string
  onImportComplete?: () => void
}

export function SplitwiseImport({
  groupId,
  onImportComplete,
}: SplitwiseImportProps) {
  const [open, setOpen] = useState(false)
  const [csvContent, setCsvContent] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const t = useTranslations('SplitwiseImport')

  const { mutateAsync: importSplitwise } =
    trpc.groups.expenses.importSplitwise.useMutation()
  const utils = trpc.useUtils()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error(t('toast.invalidFileType.title'), {
        description: t('toast.invalidFileType.description'),
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setCsvContent(content)
    }
    reader.readAsText(file)
  }

  const handleClear = () => {
    setCsvContent('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleImport = async () => {
    if (!csvContent.trim()) {
      toast.error(t('toast.noContent.title'), {
        description: t('toast.noContent.description'),
      })
      return
    }

    try {
      setIsImporting(true)
      const result = await importSplitwise({
        groupId,
        csvContent,
      })

      toast.success(t('toast.success.title'), {
        description: t('toast.success.description', {
          count: result.importedCount,
        }),
      })

      // Refresh the expenses list
      utils.groups.expenses.invalidate()

      // Close dialog and reset state
      setOpen(false)
      setCsvContent('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      onImportComplete?.()
    } catch (error) {
      console.error('Import failed:', error)
      toast.error(t('toast.error.title'), {
        description:
          error instanceof Error ? error.message : t('toast.error.description'),
      })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="secondary" size="icon">
              <Upload className="w-4 h-4" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t('button')}</p>
        </TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csv-file">{t('fileLabel')}</Label>
            <div className="flex gap-2">
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                ref={fileInputRef}
                disabled={isImporting}
                className="flex-1"
              />
              {csvContent && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleClear}
                      disabled={isImporting}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('clear')}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {csvContent && (
            <div className="space-y-2">
              <Label>{t('previewLabel')}</Label>
              <div className="p-3 bg-muted rounded-md text-sm font-mono overflow-auto">
                {csvContent
                  .split('\n')
                  .slice(0, 10)
                  .map((line, index) => (
                    <div key={index} className="break-all whitespace-pre-wrap">
                      {line}
                    </div>
                  ))}
                {csvContent.split('\n').length > 10 && (
                  <div className="text-muted-foreground">...</div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isImporting}
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleImport}
              disabled={!csvContent || isImporting}
              className="gap-2"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('importing')}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  {t('import')}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
