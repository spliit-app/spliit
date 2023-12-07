import { Reimbursement } from '@/lib/balances'
import { Participant } from '@prisma/client'

type Props = {
  reimbursements: Reimbursement[]
  participants: Participant[]
  currency: string
}

export function ReimbursementList({
  reimbursements,
  participants,
  currency,
}: Props) {
  const getParticipant = (id: string) => participants.find((p) => p.id === id)
  return (
    <div className="text-sm">
      {reimbursements.map((reimbursement, index) => (
        <div className="border-t p-4 flex justify-between" key={index}>
          <div>
            <strong>{getParticipant(reimbursement.from)?.name}</strong> owes{' '}
            <strong>{getParticipant(reimbursement.to)?.name}</strong>
          </div>
          <div>
            {currency} {reimbursement.amount.toFixed(2)}
          </div>
        </div>
      ))}
    </div>
  )
}
