import { cached } from '@/app/cached-functions'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Pencil } from 'lucide-react'
import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Totals',
}

export default async function InformationPage({
  params: { groupId },
}: {
  params: { groupId: string }
}) {
  const group = await cached.getGroup(groupId)
  if (!group) notFound()

  const t = await getTranslations('Information')

  return (
    <>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex justify-between">
            <span>{t('title')}</span>
            <Button size="icon" asChild className="-mb-12">
              <Link href={`/groups/${groupId}/edit`}>
                <Pencil className="w-4 h-4" />
              </Link>
            </Button>
          </CardTitle>
          <CardDescription className="mr-12">
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm sm:prose-base max-w-full whitespace-break-spaces">
          {group.information || (
            <p className="text-muted-foreground italic">{t('empty')}</p>
          )}
        </CardContent>
      </Card>
    </>
  )
}
