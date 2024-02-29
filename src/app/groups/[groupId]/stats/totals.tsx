'use client'
import { TotalsGroupSpending } from '@/app/groups/[groupId]/stats/totals-group-spending'
import { TotalsYourShare } from '@/app/groups/[groupId]/stats/totals-your-share'
import { TotalsYourSpendings } from '@/app/groups/[groupId]/stats/totals-your-spending'
import { getGroup, getGroupExpenses } from '@/lib/api'
import { useActiveUser } from '@/lib/hooks'

export function Totals({
  group,
  expenses,
  totalGroupSpendings,
}: {
  group: NonNullable<Awaited<ReturnType<typeof getGroup>>>
  expenses: NonNullable<Awaited<ReturnType<typeof getGroupExpenses>>>
  totalGroupSpendings: number
}) {
  const activeUser = useActiveUser(group.id)
  console.log('activeUser', activeUser)

  return (
    <>
      <TotalsGroupSpending
        totalGroupSpendings={totalGroupSpendings}
        currency={group.currency}
      />
      {activeUser && activeUser !== 'None' && (
        <>
          <TotalsYourSpendings group={group} expenses={expenses} />
          <TotalsYourShare group={group} expenses={expenses} />
        </>
      )}
    </>
  )
}
