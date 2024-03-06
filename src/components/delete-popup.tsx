'use client'

import { Trash2 } from "lucide-react"
import { AsyncButton } from "./async-button"
import { Button } from "./ui/button"
import { Dialog,DialogClose,DialogContent,DialogDescription,DialogOverlay,DialogPortal,DialogTitle,DialogTrigger } from "./ui/dialog"

export function DeletePopup({ onDelete }: { onDelete: () => Promise<void> }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent>
          <DialogTitle>Are your sure?</DialogTitle>
          <DialogDescription>
            Do you really want to delete the expense?
          </DialogDescription>
          <AsyncButton
            type="button"
            variant="destructive"
            loadingContent="Deleting…"
            action={onDelete}
          >
            Yes
          </AsyncButton>
          <DialogClose>Close</DialogClose>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}