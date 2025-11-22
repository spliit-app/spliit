'use client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
Popover,
PopoverContent,
PopoverTrigger,
} from '@/components/ui/popover'
import { trpc } from '@/trpc/client'
import { Group } from '@prisma/client'
import { Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  group: Group
}


export function DeleteGroupButton({ group }: Props) {
  const { mutateAsync } = trpc.groups.delete.useMutation()
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
      <PopoverContent align="end" className="[&_p]:text-sm flex flex-col gap-3">
        <p>{t('description')}</p>
        <div className="flex gap-2">
          <Input
            className="flex-1"
            placeholder={t('groupNameField') + ` (${group.name})`}
            onChange={e => setInputValue(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="destructive"
            className="flex-1"
            onClick={() => mutateAsync({ groupId: group.id, groupName: inputValue }).then(() => router.push(`/groups/${group.id}`))}
            disabled={inputValue !== group.name}
          >
            {t('title')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
