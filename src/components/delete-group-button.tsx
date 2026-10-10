'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useToast } from '@/components/ui/use-toast'
import { Group } from '@/generated/prisma/client'
import { useActiveUser } from '@/lib/hooks'
import { trpc } from '@/trpc/client'
import { Loader2, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Props = {
  group: Group
}

export function DeleteGroupButton({ group }: Props) {
  const { mutateAsync } = trpc.groups.delete.useMutation()
  const utils = trpc.useUtils()
  const t = useTranslations('DeleteGroupButton')
  const { toast } = useToast()
  const activeUserId = useActiveUser(group.id)
  const [inputValue, setInputValue] = useState('')
  // Covers the redirect as well as the mutation.
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button title={t('title')} variant="destructive">
          <Trash2 className="w-4 h-4 mr-2" /> {t('title')}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start">
        <form
          className="[&_p]:text-sm flex flex-col gap-3"
          onSubmit={async (event) => {
            event.preventDefault()
            // The popover is portaled out of the group form in the DOM, but
            // React still bubbles the submit event up to it.
            event.stopPropagation()
            if (isSubmitting || inputValue !== group.name) return
            setIsSubmitting(true)
            try {
              await mutateAsync({
                groupId: group.id,
                groupName: inputValue,
                participantId: activeUserId ?? undefined,
              })
            } catch {
              toast({
                title: t('ErrorToast.title'),
                description: t('ErrorToast.description'),
                variant: 'destructive',
              })
              setIsSubmitting(false)
              return
            }
            await utils.groups.invalidate()
            router.push(`/groups/${group.id}`)
          }}
        >
          <p>{t('description')}</p>
          <div className="flex gap-2">
            <Input
              className="flex-1"
              placeholder={t('groupNameField') + ` (${group.name})`}
              onChange={(e) => setInputValue(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              variant="destructive"
              className="flex-1"
              disabled={isSubmitting || inputValue !== group.name}
            >
              {isSubmitting && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {t('title')}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
}
