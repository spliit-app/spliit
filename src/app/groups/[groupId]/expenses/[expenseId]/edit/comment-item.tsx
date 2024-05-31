'use client'
import { Button } from '@/components/ui/button'
import { getComment } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { Trash2 } from 'lucide-react'

export type Props = {
  comment: NonNullable<Awaited<ReturnType<typeof getComment>>>
  onDelete: (commentID: string) => Promise<void>
}

export function CommentItem({ comment, onDelete }: Props) {
  return (
    <div className="flex justify-between sm:mx-6 px-4 sm:rounded-lg sm:pr-2 sm:pl-4 py-4 text-sm cursor-pointer hover:bg-accent gap-1 items-stretch">
      <div className="flex-1">
        <div className="mb-1">{comment.comment}</div>
        <div className="text-xs text-muted-foreground">
          by {comment.participant.name},{' '}
          {formatDate(comment.time, {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </div>
      </div>
      <Button variant="destructive" onClick={() => onDelete(comment.id)}>
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  )
}
