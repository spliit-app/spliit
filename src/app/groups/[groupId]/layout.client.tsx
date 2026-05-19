'use client'

import { useToast } from '@/components/ui/use-toast'
import {
  IMPORTING_GROUP_AT_KEY,
  IMPORTING_GROUP_KEY,
} from '@/lib/anonymous-constants'
import { trpc } from '@/trpc/client'
import { useTranslations } from 'next-intl'
import { PropsWithChildren, useEffect } from 'react'
import { CurrentGroupProvider } from './current-group-context'
import { GroupHeader } from './group-header'
import { SaveGroupLocally } from './save-recent-group'

export function GroupLayoutClient({
  groupId,
  children,
}: PropsWithChildren<{ groupId: string }>) {
  const { data, isLoading } = trpc.groups.get.useQuery({ groupId })
  const t = useTranslations('Groups.NotFound')
  const { toast } = useToast()

  useEffect(() => {
    if (data?.group) {
      localStorage.removeItem(IMPORTING_GROUP_KEY)
      localStorage.removeItem(IMPORTING_GROUP_AT_KEY)
      return
    }

    if (data && !data.group) {
      const importingGroupId = localStorage.getItem(IMPORTING_GROUP_KEY)
      const importingAt = localStorage.getItem(IMPORTING_GROUP_AT_KEY)
      const importingAtTime = importingAt ? Date.parse(importingAt) : NaN
      const isImporting =
        importingGroupId === groupId &&
        Number.isFinite(importingAtTime) &&
        Date.now() - importingAtTime < 5 * 60 * 1000

      toast({
        description: isImporting ? t('importing') : t('text'),
        variant: isImporting ? undefined : 'destructive',
      })
    }
  }, [data, groupId, t, toast])

  const props =
    isLoading || !data?.group
      ? { isLoading: true as const, groupId, group: undefined }
      : { isLoading: false as const, groupId, group: data.group }

  if (isLoading) {
    return (
      <CurrentGroupProvider {...props}>
        <GroupHeader />
        {children}
      </CurrentGroupProvider>
    )
  }

  return (
    <CurrentGroupProvider {...props}>
      <GroupHeader />
      {children}
      <SaveGroupLocally />
    </CurrentGroupProvider>
  )
}
