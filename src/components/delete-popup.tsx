import { Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { AsyncButton } from './async-button'
import { Button } from './ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'

export function DeletePopup({
  onDelete,
  className,
  open,
  onOpenChange,
  showTrigger = true,
  copy,
}: {
  onDelete: () => Promise<void>
  className?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  showTrigger?: boolean
  copy?: {
    title: string
    description: string
    yes: string
    cancel: string
    loading: string
  }
}) {
  const t = useTranslations('ExpenseForm.DeletePopup')
  const [deleting, setDeleting] = useState(false)
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!deleting) onOpenChange?.(value)
      }}
    >
      {showTrigger && (
        <DialogTrigger asChild>
          <Button type="button" variant="destructive" className={className}>
            <Trash2 className="w-4 h-4 mr-2" />
            {t('label')}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogTitle>{copy?.title ?? t('title')}</DialogTitle>
        <DialogDescription>
          {copy?.description ?? t('description')}
        </DialogDescription>
        <DialogFooter className="flex flex-col gap-2">
          <AsyncButton
            type="button"
            variant="destructive"
            loadingContent={copy?.loading ?? 'Deleting…'}
            disabled={deleting}
            action={async () => {
              setDeleting(true)
              try {
                await onDelete()
              } finally {
                setDeleting(false)
              }
            }}
          >
            {copy?.yes ?? t('yes')}
          </AsyncButton>
          <DialogClose asChild>
            <Button type="button" variant={'secondary'} disabled={deleting}>
              {copy?.cancel ?? t('cancel')}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
