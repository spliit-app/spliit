import { Button } from '@/components/ui/button'
import { Reimbursement } from '@/lib/balances'
import { Participant } from '@prisma/client'
import Link from 'next/link'

type Props = {
  reimbursements: Reimbursement[]
  participants: Participant[]
  currency: string
  groupId: string
}

export function ReimbursementList({
  reimbursements,
  participants,
  currency,
  groupId,
}: Props) {
  const getParticipant = (id: string) => participants.find((p) => p.id === id)
  return (
    <div className="text-sm">
      {reimbursements.map((reimbursement, index) => (
        <div className="border-t p-4 flex justify-between" key={index}>
          <div>
            <strong>{getParticipant(reimbursement.from)?.name}</strong> owes{' '}
            <strong>{getParticipant(reimbursement.to)?.name}</strong>
            <Button variant="link" asChild className="-my-3">
              <Link
                href={`/groups/${groupId}/expenses/create?reimbursement=yes&from=${reimbursement.from}&to=${reimbursement.to}&amount=${reimbursement.amount}`}
              >
                Mark as paid
              </Link>
            </Button>
          </div>
          <div>
            {currency} {reimbursement.amount.toFixed(2)}
          </div>
        </div>
      ))}
    </div>
  )
}
