'use client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getComment, getComments, getExpense, getGroup } from '@/lib/api'
import { CommentFormValues } from '@/lib/schemas'
import { PenBoxIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { CommentModal } from './comment-form'
import { CommentItem } from './comment-item'

type Props = {
  group: NonNullable<Awaited<ReturnType<typeof getGroup>>>
  expense: NonNullable<Awaited<ReturnType<typeof getExpense>>>
  comments: NonNullable<Awaited<ReturnType<typeof getComments>>>
  onCreate: (values: CommentFormValues, participantId: string) => Promise<void>
  onUpdate: (values: CommentFormValues, commentId: string) => Promise<void>
  onDelete: (commentId: string) => Promise<void>
}

export function CommentsList({
  group,
  expense,
  comments,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const [selectedComment, setSelectedComment] =
    useState<NonNullable<Awaited<ReturnType<typeof getComment>>>>()
  const [commentModalOpen, setCommentModalOpen] = useState(false)
  const t = useTranslations('ExpenseComments')

  return (
    <>
      <Card>
        <CardHeader className="grid grid-cols-2">
          <CardTitle className="col-span-1">{t('title')}</CardTitle>
          <Button
            className="col-span-1 align-right"
            type="button"
            variant="ghost"
            onClick={() => {
              setSelectedComment(undefined)
              setCommentModalOpen(true)
            }}
          >
            <PenBoxIcon></PenBoxIcon>
          </Button>
        </CardHeader>
        <CardContent>
          {comments.length > 0 ? (
            comments.map(
              (
                comment: NonNullable<Awaited<ReturnType<typeof getComment>>>,
              ) => (
                <CommentItem
                  key={comment.id}
                  group={group}
                  comment={comment}
                  onDelete={onDelete}
                  onClick={(
                    comment: NonNullable<
                      Awaited<ReturnType<typeof getComment>>
                    >,
                  ) => {
                    setSelectedComment(comment)
                    setCommentModalOpen(true)
                  }}
                />
              ),
            )
          ) : (
            <p className="px-6 text-sm py-6">{t('noComments')}</p>
          )}
        </CardContent>
      </Card>
      <CommentModal
        isOpen={commentModalOpen}
        group={group}
        onCreate={async (values, participantId) => {
          await onCreate(values, participantId)
          setCommentModalOpen(false)
        }}
        onUpdate={async (values, commentId) => {
          await onUpdate(values, commentId)
          setCommentModalOpen(false)
        }}
        onCancel={() => setCommentModalOpen(false)}
        comment={selectedComment}
        updateOpen={(open) => setCommentModalOpen(open)}
      />
    </>
  )
}
