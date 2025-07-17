import { Button } from '@/components/ui/button'
import { Reimbursement } from '@/lib/balances'
import { formatCurrency } from '@/lib/utils'
import { Participant } from '@prisma/client'
import { useLocale, useTranslations } from 'next-intl'
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
  const locale = useLocale()
  const t = useTranslations('Balances.Reimbursements')
  if (reimbursements.length === 0) {
    return <p className="text-sm pb-6">{t('noImbursements')}</p>
  }

  const getParticipant = (id: string) => participants.find((p) => p.id === id)
  return (
    <div className="text-sm">
      {reimbursements.map((reimbursement, index) => (
        <div className="py-4 flex justify-between" key={index}>
          <div className="flex flex-col gap-1 items-start sm:flex-row sm:items-baseline sm:gap-4">
            <div>
              {t.rich('owes', {
                from: getParticipant(reimbursement.from)?.name,
                to: getParticipant(reimbursement.to)?.name,
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </div>
            <Button variant="link" asChild className="-mx-4 -my-3">
              <Link
                href={`/groups/${groupId}/expenses/create?reimbursement=yes&from=${reimbursement.from}&to=${reimbursement.to}&amount=${reimbursement.amount}`}
              >
                {t('markAsPaid')}
              </Link>
            </Button>
          </div>
          <div>{formatCurrency(currency, reimbursement.amount, locale)}</div>
        </div>
      ))}
    </div>
  )
}
