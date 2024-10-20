'use client'
import { RuntimeFeatureFlags } from '@/lib/featureFlags'
import { trpc } from '@/trpc/client'
import { getComments } from '@/lib/api'
import { useRouter } from 'next/navigation'
import { ExpenseForm } from './expense-form'
import { commentFormSchema } from '@/lib/schemas'
import { Suspense, useState } from 'react'
import { CommentsList } from './[expenseId]/edit/comments-list'

export function EditExpenseForm({
  groupId,
  expenseId,
  runtimeFeatureFlags,
}: {
  groupId: string
  expenseId: string
  runtimeFeatureFlags: RuntimeFeatureFlags
}) {
  const { data: groupData } = trpc.groups.get.useQuery({ groupId })
  const group = groupData?.group

  const { data: categoriesData } = trpc.categories.list.useQuery()
  const categories = categoriesData?.categories

  const { data: commentsData } = trpc.groups.expenses.comments.list.useQuery({expenseId})
  const comments = commentsData?.comments ?? []

  const { data: expenseData } = trpc.groups.expenses.get.useQuery({
    groupId,
    expenseId,
  })
  const expense = expenseData?.expense

  const { mutateAsync: updateExpenseMutateAsync } =
    trpc.groups.expenses.update.useMutation()
  const { mutateAsync: deleteExpenseMutateAsync } =
    trpc.groups.expenses.delete.useMutation()

  const { mutateAsync: addExpenseCommentMutateAsync } =
    trpc.groups.expenses.comments.create.useMutation()
  const { mutateAsync: updateExpenseCommentMutateAsync } =
    trpc.groups.expenses.comments.update.useMutation()
  const { mutateAsync: deleteExpenseCommentMutateAsync } =
    trpc.groups.expenses.comments.delete.useMutation()

  const utils = trpc.useUtils()
  const router = useRouter()

  if (!group || !categories || !expense) return null

  return (
    <Suspense>
      <ExpenseForm
        group={group}
        expense={expense}
        categories={categories}
        onSubmit={async (expenseFormValues, participantId) => {
          await updateExpenseMutateAsync({
            expenseId,
            groupId,
            expenseFormValues,
            participantId,
          })
          utils.groups.expenses.invalidate()
          router.push(`/groups/${group.id}`)
        }}
        onDelete={async (participantId) => {
          await deleteExpenseMutateAsync({
            expenseId,
            groupId,
            participantId,
          })
          utils.groups.expenses.invalidate()
          router.push(`/groups/${group.id}`)
        }}
        runtimeFeatureFlags={runtimeFeatureFlags}
      />
      <CommentsList
        group={group}
        expense={expense}
        comments={comments}
        onCreate={async (values: unknown, participantId: string) => {
          const commentFormValues = commentFormSchema.parse(values)
          await addExpenseCommentMutateAsync({
            expenseId: expense!.id,
            participantId,
            text: commentFormValues.comment
          })
          router.refresh()
        }}
        onUpdate={async (values: unknown, commentId: string) => {
          const commentFormValues = commentFormSchema.parse(values)
          await updateExpenseCommentMutateAsync({
            commentId,
            text: commentFormValues.comment
          })
          router.refresh()
        }}
        onDelete={async (commentId: string) => {
          await deleteExpenseCommentMutateAsync({commentId})
          router.refresh()
        }}
      />
    </Suspense>
  )
}
