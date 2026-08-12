'use client'

import { Button } from '@/components/ui/button'
import { Card,CardContent,CardDescription,CardHeader,CardTitle } from '@/components/ui/card'
import { trpc } from '@/trpc/client'
import { useTranslations } from 'next-intl'
import { useCurrentGroup } from './current-group-context'

export const DeleteGroupNotice = () => {
  const { group } = useCurrentGroup()
  const t = useTranslations('DeleteGroupNotice')
  const { mutateAsync } = trpc.groups.restore.useMutation()

  return ( group?.deleteAt &&
    <Card className="border-red-700">
      <CardHeader>
        <CardTitle className="text-red-700">{t('title')}</CardTitle>
        <CardDescription>{
          t.rich('description', {
            date: group?.deleteAt?.toLocaleDateString() ?? '',
          })
        }</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="destructive"
          onClick={() => {
            mutateAsync({ groupId: group.id }).then(() => window.location.reload())
          }}
        >
          {t('restore')}
        </Button>
      </CardContent>
    </Card>
  )
}
