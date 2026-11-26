'use client'

import { Money } from '@/components/money'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Currency } from '@/lib/currency'
import { trpc } from '@/trpc/client'
import { CalendarClock } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useId, useState } from 'react'

/** A settle-up is a promise, not an invoice: a week ahead is a sane default. */
const DEFAULT_DUE_IN_DAYS = 7

export function defaultDueDate(today = new Date()) {
  const date = new Date(today.getTime() + DEFAULT_DUE_IN_DAYS * 86_400_000)
  return date.toISOString().slice(0, 10)
}

type Props = {
  groupId: string
  from: string
  fromName: string
  to: string
  toName: string
  amount: number
  currency: Currency
  /** The current participant, recorded as the one who asked. */
  participantId?: string | null
}

/**
 * Turns a suggested reimbursement into a settle-up with a deadline, which is
 * what the notification layer later reads. Nothing is created until the user
 * confirms: the date is the only input a deadline needs.
 */
export function AskSettleUpButton({
  groupId,
  from,
  fromName,
  to,
  toName,
  amount,
  currency,
  participantId,
}: Props) {
  const tr = useTranslations('Balances.Reimbursements')
  const utils = trpc.useUtils()
  const id = useId()
  const [open, setOpen] = useState(false)
  const [dueDate, setDueDate] = useState(() => defaultDueDate())

  const { mutate, isPending, error } =
    trpc.groups.paymentDues.create.useMutation({
      onSuccess: () => {
        utils.groups.paymentDues.invalidate()
        // The header bell reads the same obligations from a different query.
        utils.account.notifications.invalidate()
        setOpen(false)
      },
    })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="link" className="-mx-4 -my-3">
          <CalendarClock className="w-3 h-3 mr-1" />
          {tr('askDueDate')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{tr('askDueDate')}</DialogTitle>
          <DialogDescription>
            {fromName} → {toName} ·{' '}
            <Money currency={currency} amount={amount} />
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            mutate({
              groupId,
              fromParticipantId: from,
              toParticipantId: to,
              amount,
              dueDate,
            })
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor={id}>{tr('dueDateLabel')}</Label>
            <Input
              id={id}
              type="date"
              required
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </div>
          {error ? (
            <p className="text-sm text-red-600">{error.message}</p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {tr('dueDateSubmit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
