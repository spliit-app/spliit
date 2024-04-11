'use client'
import { Money } from '@/components/money'
import { getBalances } from '@/lib/balances'
import { useActiveUser } from '@/lib/hooks'

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
  return (
    <>
      {' \u00b7 '}
      {fmtBalance}
    </>
  )
}
