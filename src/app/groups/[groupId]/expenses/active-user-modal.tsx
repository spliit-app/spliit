'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { getGroup } from '@/lib/api'
import { useMediaQuery } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import { ComponentProps, useEffect, useState } from 'react'

type Props = {
  group: NonNullable<Awaited<ReturnType<typeof getGroup>>>
}

export function ActiveUserModal({ group }: Props) {
  const [open, setOpen] = useState(false)
  const isDesktop = useMediaQuery('(min-width: 768px)')

  useEffect(() => {
    const tempUser = localStorage.getItem(`newGroup-activeUser`)
    const activeUser = localStorage.getItem(`${group.id}-activeUser`)
    if (!tempUser && !activeUser) {
      setOpen(true)
    }
  }, [group])

  function updateOpen(open: boolean) {
    if (!open && !localStorage.getItem(`${group.id}-activeUser`)) {
      localStorage.setItem(`${group.id}-activeUser`, 'None')
    }
    setOpen(open)
  }

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={updateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Who are you?</DialogTitle>
            <DialogDescription>
              Tell us which participant you are to let us customize how the
              information is displayed.
            </DialogDescription>
          </DialogHeader>
          <ActiveUserForm group={group} close={() => setOpen(false)} />
          <DialogFooter className="sm:justify-center">
            <p className="text-sm text-center text-muted-foreground">
              This setting can be changed later in the group settings.
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={updateOpen}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Who are you?</DrawerTitle>
          <DrawerDescription>
            Tell us which participant you are to let us customize how the
            information is displayed.
          </DrawerDescription>
        </DrawerHeader>
        <ActiveUserForm
          className="px-4"
          group={group}
          close={() => setOpen(false)}
        />
        <DrawerFooter className="pt-2">
          <p className="text-sm text-center text-muted-foreground">
            This setting can be changed later in the group settings.
          </p>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

function ActiveUserForm({
  group,
  close,
  className,
}: ComponentProps<'form'> & { group: Props['group']; close: () => void }) {
  const [selected, setSelected] = useState('None')

  return (
    <form
      className={cn('grid items-start gap-4', className)}
      onSubmit={(event) => {
        event.preventDefault()
        localStorage.setItem(`${group.id}-activeUser`, selected)
        close()
      }}
    >
      <RadioGroup defaultValue="none" onValueChange={setSelected}>
        <div className="flex flex-col gap-4 my-4">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="none" id="none" />
            <Label htmlFor="none" className="italic font-normal flex-1">
              I don’t want to select anyone
            </Label>
          </div>
          {group.participants.map((participant) => (
            <div key={participant.id} className="flex items-center space-x-2">
              <RadioGroupItem value={participant.id} id={participant.id} />
              <Label htmlFor={participant.id} className="flex-1">
                {participant.name}
              </Label>
            </div>
          ))}
        </div>
      </RadioGroup>
      <Button type="submit">Save changes</Button>
    </form>
  )
}
