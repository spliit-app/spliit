'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Group } from '@/generated/prisma/client'
import { trpc } from '@/trpc/client'
import { Trash2 } from 'lucide-react'
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
  const [inputValue, setInputValue] = useState('')
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
            if (inputValue !== group.name) return
            await mutateAsync({ groupId: group.id, groupName: inputValue })
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
              disabled={inputValue !== group.name}
            >
              {t('title')}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
}
