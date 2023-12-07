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
  if (reimbursements.length === 0) {
    return (
      <p className="px-6 text-sm pb-6">
        It looks like your group doesn’t need any reimbursement 😁
      </p>
    )
  }

  const getParticipant = (id: string) => participants.find((p) => p.id === id)
  return (
    <div className="text-sm">
      {reimbursements.map((reimbursement, index) => (
        <div className="border-t px-6 py-4 flex justify-between" key={index}>
          <div className="flex flex-col gap-1 items-start sm:flex-row sm:items-baseline sm:gap-4">
            <div>
              <strong>{getParticipant(reimbursement.from)?.name}</strong> owes{' '}
              <strong>{getParticipant(reimbursement.to)?.name}</strong>
            </div>
            <Button variant="link" asChild className="-mx-4 -my-3">
              <Link
                href={`/groups/${groupId}/expenses/create?reimbursement=yes&from=${reimbursement.from}&to=${reimbursement.to}&amount=${reimbursement.amount}`}
              >
                Mark as paid
              </Link>
            </Button>
          </div>
          <div>
            {currency} {(reimbursement.amount / 100).toFixed(2)}
          </div>
        </div>
      ))}
    </div>
  )
}
