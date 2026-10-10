'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { useActiveUser } from '@/lib/hooks'
import { formatDate } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { useCurrentGroup } from './current-group-context'

export const DeleteGroupNotice = () => {
  const { group, groupId } = useCurrentGroup()
  const t = useTranslations('DeleteGroupNotice')
  const locale = useLocale()
  const { toast } = useToast()
  const activeUserId = useActiveUser(groupId)
  const { mutateAsync } = trpc.groups.restore.useMutation()
  const utils = trpc.useUtils()
  const [isRestoring, setIsRestoring] = useState(false)

  if (!group?.deleteAt) return null

  // Past this date the group may be being purged, and cannot be restored.
  const canRestore = group.deleteAt > new Date()

  const restore = async () => {
    setIsRestoring(true)
    try {
      await mutateAsync({
        groupId: group.id,
        participantId: activeUserId ?? undefined,
      })
      await utils.groups.invalidate()
    } catch {
      toast({
        title: t('ErrorToast.title'),
        description: t('ErrorToast.description'),
        variant: 'destructive',
      })
    } finally {
      setIsRestoring(false)
    }
  }

  return (
    <Card className="border-red-700">
      <CardHeader>
        <CardTitle className="text-red-700">{t('title')}</CardTitle>
        <CardDescription>
          {canRestore
            ? t('description', {
                date: formatDate(group.deleteAt, locale, { dateStyle: 'long' }),
              })
            : t('pastDeadline')}
        </CardDescription>
      </CardHeader>
      {canRestore && (
        <CardContent>
          <Button
            variant="destructive"
            onClick={restore}
            disabled={isRestoring}
          >
            {isRestoring && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t('restore')}
          </Button>
        </CardContent>
      )}
    </Card>
  )
}
