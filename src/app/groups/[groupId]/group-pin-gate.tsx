'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { trpc } from '@/trpc/client'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PropsWithChildren, useState } from 'react'

type Props = PropsWithChildren<{
  groupId: string
  hasPin: boolean
  locked: boolean
}>

export function GroupPinGate({ groupId, hasPin, locked, children }: Props) {
  const t = useTranslations('GroupPin')
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const utils = trpc.useUtils()
  const { mutateAsync, isPending } = trpc.groups.verifyPin.useMutation()

  if (!hasPin || !locked) return <>{children}</>

  return (
    <Dialog open>
      <DialogContent
        className="sm:max-w-md [&>button.absolute]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={async (event) => {
            event.preventDefault()
            setError(null)
            try {
              await mutateAsync({ groupId, pin })
              await utils.groups.get.invalidate({ groupId })
            } catch {
              setError(t('incorrect'))
            }
          }}
        >
          <Input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            placeholder={t('placeholder')}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            required
            minLength={4}
            maxLength={8}
            pattern="\d{4,8}"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={isPending || pin.length < 4}>
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              t('unlock')
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
