import { AsyncButton } from '@/components/async-button'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { CircleStop } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function StopRecurringPopup({
  onStop,
}: {
  onStop: () => Promise<void>
}) {
  const t = useTranslations('Recurring.StopPopup')
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <CircleStop className="w-4 h-4 mr-2" />
          {t('label')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{t('title')}</DialogTitle>
        <DialogDescription>{t('description')}</DialogDescription>
        <DialogFooter className="flex flex-col gap-2">
          <AsyncButton type="button" variant="destructive" action={onStop}>
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
