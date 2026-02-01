'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { Undo2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function DeleteDataButton({
  groupId,
  hasImportedData,
}: {
  groupId: string
  hasImportedData: boolean
}) {
  const t = useTranslations('DeleteData')
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  if (!hasImportedData) {
    return null
  }

  const handleUndo = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/groups/${groupId}/data/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'undo-import' }),
      })

      const data = (await response.json()) as {
        success?: boolean
        message?: string
        error?: string
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to undo import')
      }

      toast({
        description: data.message || t('success'),
      })
      setOpen(false)
      router.refresh()
    } catch (error) {
      toast({
        description: error instanceof Error ? error.message : t('error'),
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start">
          <Undo2 className="w-4 h-4 mr-2" />
          {t('undoImport')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('undoImport')}</DialogTitle>
          <DialogDescription>{t('undoImportDescription')}</DialogDescription>
        </DialogHeader>

        <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
          {t('undoWarning')}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleUndo} disabled={isDeleting}>
            {isDeleting ? t('deleting') : t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
