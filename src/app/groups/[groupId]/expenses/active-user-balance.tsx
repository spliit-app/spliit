'use client'
import { Money } from '@/components/money'
import { Reimbursement, getBalances } from '@/lib/balances'
import { useActiveUser } from '@/lib/hooks'
import { Participant } from '@prisma/client'

type Props = {
  groupId: string
  currency: string
  expense: Parameters<typeof getBalances>[0][number]
}

export function ActiveUserBalance({ groupId, currency, expense }: Props) {
  const activeUserId = useActiveUser(groupId)
  if (activeUserId === null || activeUserId === '' || activeUserId === 'None') {
    return null
  }

  const balances = getBalances([expense])
  let fmtBalance = <>You are not involved</>
  if (Object.hasOwn(balances, activeUserId)) {
    const balance = balances[activeUserId]
    let balanceDetail = <></>
    if (balance.paid > 0 && balance.paidFor > 0) {
      balanceDetail = (
        <>
          {' ('}
          <Money {...{ currency, amount: balance.paid }} />
          {' - '}
          <Money {...{ currency, amount: balance.paidFor }} />
          {')'}
        </>
      )
    }
    fmtBalance = (
      <>
        Your balance:{' '}
        <Money {...{ currency, amount: balance.total }} bold colored />
        {balanceDetail}
      </>
    )
  }
  return <div className="text-xs text-muted-foreground">{fmtBalance}</div>
}

// Get all the suggested reimbursements for the current user
export function ActiveUserReimbursementList({
  reimbursements,
  participants,
  currency,
  groupId,
}: {
  reimbursements: Reimbursement[]
  participants: Participant[]
  currency: string
  groupId: string
}) {
  const activeUserId = useActiveUser(groupId)
  if (activeUserId === null || activeUserId === '' || activeUserId === 'None') {
    return null
  }
  if (reimbursements.length === 0) {
    return null
  }

  let total = 0
  for (const reimbursement of reimbursements) {
    if (
      reimbursement.from !== activeUserId &&
      reimbursement.to !== activeUserId
    ) {
      continue
    }
    let sign = reimbursement.from === activeUserId ? -1 : 1
    total += sign * reimbursement.amount
  }

  if (total === 0) {
    return null
  }

  const getParticipant = (id: string) =>
    participants.find((p) => p.id === id) || { name: 'Unknown' }

  const currentUser = <>({getParticipant(activeUserId).name})</>

  const userReimbursements = reimbursements
    .filter((r) => r.from === activeUserId || r.to === activeUserId)
    .map((r) => {
      const from = getParticipant(r.from)
      const to = getParticipant(r.to)
      const amount = r.amount
      if (r.from === activeUserId) {
        return (
          <div key={r.from + r.to} className="text-sm">
            You owe {to.name}{' '}
            <Money
              currency={currency}
              amount={amount}
              bold
              colored
              negative={true}
            />
          </div>
        )
      } else {
        return (
          <div key={r.from + r.to} className="text-sm">
            {from.name} owes you{' '}
            <Money currency={currency} amount={amount} bold colored />
          </div>
        )
      }
    })

  return (
    <div className="text-sm">
      <strong>Your balance {currentUser}:</strong>{' '}
      <Money currency={currency} amount={total} bold colored />
      <div className="mt-2">{userReimbursements}</div>
    </div>
  )
}
