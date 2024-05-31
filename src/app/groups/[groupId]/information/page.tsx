import { cached } from '@/app/cached-functions'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
          <CardTitle>Information</CardTitle>
          <CardDescription>
            <Link href={`/groups/${groupId}/edit`}>Edit</Link>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col space-y-4">
          {group.information && (
            <div className="flex gap-2 justify-between">
              <div className="text-xs text-foreground whitespace-break-spaces">
                {group.information}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
