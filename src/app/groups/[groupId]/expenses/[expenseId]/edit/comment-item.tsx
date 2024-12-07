'use client'
import { Button } from '@/components/ui/button'
import { getComment, getGroup } from '@/lib/api'
import { useActiveUser } from '@/lib/hooks'
import { formatDate } from '@/lib/utils'
import { Edit2, Trash2 } from 'lucide-react'
import { useLocale } from 'next-intl'

export type Props = {
  comment: NonNullable<Awaited<ReturnType<typeof getComment>>>
  group: NonNullable<Awaited<ReturnType<typeof getGroup>>>
  onDelete: (commentId: string) => Promise<void>
  onClick: (
    comment: NonNullable<Awaited<ReturnType<typeof getComment>>>,
  ) => void
}

export function CommentItem({ comment, group, onDelete, onClick }: Props) {
  const activeUserId = useActiveUser(group.id)
  const locale = useLocale()

  return (
    <div className="flex justify-between sm:mx-6 px-4 sm:rounded-lg sm:pr-2 sm:pl-4 py-4 text-sm cursor-pointer hover:bg-accent gap-1 items-stretch">
      <div className="flex-1">
        <div className="mb-1">{comment.comment}</div>
        <div className="text-xs text-muted-foreground">
          by {comment.participant.name},{' '}
          {formatDate(comment.time, locale, {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </div>
      </div>
      {comment.participantId == activeUserId ? (
        <Button
          variant="ghost"
          onClick={() => {
            onClick(comment)
          }}
        >
          <Edit2 className="w-4 h-4" />
        </Button>
      ) : (
        <></>
      )}
      <Button variant="ghost" onClick={() => onDelete(comment.id)}>
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  )
}
