import { cached } from '@/app/cached-functions'
import { BalancesList } from '@/app/groups/[groupId]/balances-list'
import { ReimbursementList } from '@/app/groups/[groupId]/reimbursement-list'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getGroupExpenses } from '@/lib/api'
import {
  getBalances,
  getPublicBalances,
  getSuggestedReimbursements,
} from '@/lib/balances'
import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Balances',
}

export default async function GroupPage({
  params: { groupId },
}: {
  params: { groupId: string }
}) {
  const t = await getTranslations('Balances')
  const group = await cached.getGroup(groupId)
  if (!group) notFound()

  const expenses = await getGroupExpenses(groupId)
  const balances = getBalances(expenses)
  const reimbursements = getSuggestedReimbursements(balances)
  const publicBalances = getPublicBalances(reimbursements)

  return (
    <>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <BalancesList
            balances={publicBalances}
            participants={group.participants}
            currency={group.currency}
          />
        </CardContent>
      </Card>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{t('Reimbursements.title')}</CardTitle>
          <CardDescription>{t('Reimbursements.description')}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ReimbursementList
            reimbursements={reimbursements}
            participants={group.participants}
            currency={group.currency}
            groupId={groupId}
          />
        </CardContent>
      </Card>
    </>
  )
}
