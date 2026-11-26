'use client'

import { DeleteGroupNotice } from '@/app/groups/[groupId]/delete-group-notice'
import { useToast } from '@/components/ui/use-toast'
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
    if (data && !data.group) {
      toast({
        description: t('text'),
        variant: 'destructive',
      })
    }
  }, [data])

  // A non-member is answered with NOT_FOUND by the server, which is why this
  // renders "group not found" rather than a permission error: the id itself is
  // not confirmed to exist.
  const props =
    isLoading || !data?.group
      ? {
          isLoading: true as const,
          groupId,
          group: undefined,
          role: undefined,
          participantId: undefined,
        }
      : {
          isLoading: false as const,
          groupId,
          group: data.group,
          role: data.role,
          participantId: data.participantId,
        }

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
      <DeleteGroupNotice />
      {children}
      <SaveGroupLocally />
    </CurrentGroupProvider>
  )
}
