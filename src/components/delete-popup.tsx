'use client'

import { Trash2 } from 'lucide-react'
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

export function DeletePopup({ onDelete }: { onDelete: () => Promise<void> }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Delete this expense?</DialogTitle>
        <DialogDescription>
          Do you really want to delete this expense? This action is
          irreversible.
        </DialogDescription>
        <DialogFooter className="flex flex-col gap-2">
          <AsyncButton
            type="button"
            variant="destructive"
            loadingContent="Deleting…"
            action={onDelete}
          >
            Yes
          </AsyncButton>
          <DialogClose asChild>
            <Button variant={'secondary'}>Cancel</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
