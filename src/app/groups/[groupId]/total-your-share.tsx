'use client'
import { formatCurrency } from '@/lib/utils'
import { getGroup, getGroupExpenses } from '@/lib/api'
import { getTotalActiveUserShare } from '@/lib/totals'
import { useEffect, useState } from 'react'


type Props = {
    group: NonNullable<Awaited<ReturnType<typeof getGroup>>>
    expenses: NonNullable<Awaited<ReturnType<typeof getGroupExpenses>>>
}

export function TotalsYourShare({ group, expenses }: Props) {

    const [activeUser, setActiveUser] = useState('')

    useEffect(() => {
        const activeUser = localStorage.getItem(`${group.id}-activeUser`)
        if (activeUser) setActiveUser(activeUser) 

      }, [group, expenses])

    const totalActiveUserShare = getTotalActiveUserShare(activeUser, expenses)
    const currency = group.currency

    return activeUser === '' ?
    (
        <div className="text-lg">
            'No active user set!!'
        </div>
    ) : (
        <div className="text-lg">
            {formatCurrency(currency, totalActiveUserShare)}
        </div>
    )
}