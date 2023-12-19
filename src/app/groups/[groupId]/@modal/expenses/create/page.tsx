import { ExpenseModal } from '@/app/groups/[groupId]/@modal/expense-modal'
import { ExpenseForm } from '@/components/expense-form'
import { getGroup } from '@/lib/api'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Create expense',
}

export default async function ExpensePage({
  params: { groupId },
}: {
  params: { groupId: string }
}) {
  const group = await getGroup(groupId)
  if (!group) notFound()

  return (
    <ExpenseModal title="Create expense">
      <ExpenseForm group={group} />
    </ExpenseModal>
  )
}
