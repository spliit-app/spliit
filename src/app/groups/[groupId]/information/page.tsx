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

  return (
    <>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex justify-between">
            <span>Information</span>
            <Button size="icon" asChild className="-mb-12">
              <Link href={`/groups/${groupId}/edit`}>
                <Pencil className="w-4 h-4" />
              </Link>
            </Button>
          </CardTitle>
          <CardDescription className="mr-12">
            Use this place to add any information that can be relevant to the
            group participants.
          </CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm sm:prose-base max-w-full whitespace-break-spaces">
          {group.information || (
            <p className="text-muted-foreground italic">
              No group information yet.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  )
}
