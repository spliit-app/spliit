import { cached } from '@/app/cached-functions'
import { ExpenseForm } from '@/components/expense-form'
import {
  addComment,
  deleteComment,
  deleteExpense,
  getCategories,
  getComments,
  getExpense,
  updateComment,
  updateExpense,
} from '@/lib/api'
import { getRuntimeFeatureFlags } from '@/lib/featureFlags'
import { commentFormSchema, expenseFormSchema } from '@/lib/schemas'
import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { CommentsList } from './comments-list'

export const metadata: Metadata = {
  title: 'Edit expense',
}

export default async function EditExpensePage({
  params: { groupId, expenseId },
}: {
  params: { groupId: string; expenseId: string }
}) {
  const categories = await getCategories()
  const comments = await getComments(expenseId)
  const group = await cached.getGroup(groupId)
  if (!group) notFound()
  const expense = await getExpense(groupId, expenseId)
  if (!expense) notFound()

  async function updateExpenseAction(values: unknown, participantId?: string) {
    'use server'
    const expenseFormValues = expenseFormSchema.parse(values)
    await updateExpense(groupId, expenseId, expenseFormValues, participantId)
    redirect(`/groups/${groupId}`)
  }

  async function deleteExpenseAction(participantId?: string) {
    'use server'
    await deleteExpense(groupId, expenseId, participantId)
    redirect(`/groups/${groupId}`)
  }

  async function addCommentAction(values: unknown, participantId: string) {
    'use server'
    const commentFormValues = commentFormSchema.parse(values)
    await addComment(expense!.id, participantId, commentFormValues.comment)
    redirect(`/groups/${group!.id}/expenses/${expense!.id}/edit`)
  }

  async function updateCommentAction(values: unknown, commentId: string) {
    'use server'
    const commentFormValues = commentFormSchema.parse(values)
    await updateComment(commentId, commentFormValues.comment)
    redirect(`/groups/${group!.id}/expenses/${expense!.id}/edit`)
  }

  async function deleteCommentAction(commentId: string) {
    'use server'
    await deleteComment(commentId)
    redirect(`/groups/${group!.id}/expenses/${expense!.id}/edit`)
  }

  return (
    <Suspense>
      <ExpenseForm
        group={group}
        expense={expense}
        categories={categories}
        onSubmit={updateExpenseAction}
        onDelete={deleteExpenseAction}
        runtimeFeatureFlags={await getRuntimeFeatureFlags()}
      />
      <CommentsList
        group={group}
        expense={expense}
        comments={comments}
        onCreate={addCommentAction}
        onUpdate={updateCommentAction}
        onDelete={deleteCommentAction}
      />
    </Suspense>
  )
}
