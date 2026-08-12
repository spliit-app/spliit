'use client'

import { Copy } from 'lucide-react'
import { useTranslations } from 'next-intl'
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

export function ClonePopup({ onClone }: { onClone: () => Promise<void> }) {
  const t = useTranslations('ExpenseForm.ClonePopup')
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Copy className="w-4 h-4 mr-2" />
          {t('label')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{t('title')}</DialogTitle>
        <DialogDescription>{t('description')}</DialogDescription>
        <DialogFooter className="flex flex-col gap-2">
          <AsyncButton
            type="button"
            variant="destructive"
            loadingContent="Cloning…"
            action={onClone}
          >
            {t('yes')}
          </AsyncButton>
          <DialogClose asChild>
            <Button variant={'secondary'}>{t('cancel')}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
