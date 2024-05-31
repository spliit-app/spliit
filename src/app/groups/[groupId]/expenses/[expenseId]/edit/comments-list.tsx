import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  addComment,
  deleteComment,
  getComments,
  getExpense,
  getGroup,
} from '@/lib/api'
import { commentFormSchema } from '@/lib/schemas'
import { redirect } from 'next/navigation'
import { CommentForm } from './comment-form'
import { CommentItem } from './comment-item'

type Props = {
  group: NonNullable<Awaited<ReturnType<typeof getGroup>>>
  expense: NonNullable<Awaited<ReturnType<typeof getExpense>>>
  comments: NonNullable<Awaited<ReturnType<typeof getComments>>>
}

export function CommentsList({ group, expense, comments }: Props) {
  async function addCommentAction(values: unknown, participantId: string) {
    'use server'
    const commentFormValues = commentFormSchema.parse(values)
    await addComment(expense.id, participantId, commentFormValues.comment)
    redirect(`/groups/${group.id}/expenses/${expense.id}/edit`)
  }

  async function onDeleteAction(commentId: string) {
    'use server'
    await deleteComment(commentId)
    redirect(`/groups/${group.id}/expenses/${expense.id}/edit`)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Comments</CardTitle>
        </CardHeader>
        <CardContent>
          {comments.length > 0 ? (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onDelete={onDeleteAction}
              />
            ))
          ) : (
            <p className="px-6 text-sm py-6">
              This expense does not contain any comments yet.{' '}
            </p>
          )}
        </CardContent>
      </Card>
      <CommentForm group={group} onSubmit={addCommentAction} />
    </>
  )
}
