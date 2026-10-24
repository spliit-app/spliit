import { Button } from '@/components/ui/button'
import { Participant } from '@/generated/prisma/browser'
import { Reimbursement } from '@/lib/balances'
import { Currency } from '@/lib/currency'
import { getPaymentOptions, parsePaymentMethods } from '@/lib/payment-methods'
import { formatCurrency } from '@/lib/utils'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { PayDialog } from './pay-dialog'

type Props = {
  reimbursements: Reimbursement[]
  participants: Participant[]
  currency: Currency
  groupId: string
  groupName?: string
}

export function ReimbursementList({
  reimbursements,
  participants,
  currency,
  groupId,
  groupName,
}: Props) {
  const locale = useLocale()
  const t = useTranslations('Balances.Reimbursements')
  if (reimbursements.length === 0) {
    return <p className="text-sm pb-6">{t('noImbursements')}</p>
  }

  const getParticipant = (id: string) => participants.find((p) => p.id === id)
  return (
    <div className="text-sm">
      {reimbursements.map((reimbursement, index) => {
        const receiver = getParticipant(reimbursement.to)
        const markAsPaidHref = `/groups/${groupId}/expenses/create?reimbursement=yes&from=${reimbursement.from}&to=${reimbursement.to}&amount=${reimbursement.amount}`
        const formattedAmount = formatCurrency(
          currency,
          reimbursement.amount,
          locale,
        )
        const payOptions = getPaymentOptions(
          parsePaymentMethods(receiver?.paymentMethods),
          {
            amountMinor: reimbursement.amount,
            currency: {
              code: currency.code,
              decimalDigits: currency.decimal_digits,
            },
            note: groupName ? `Spliit · ${groupName}` : 'Spliit',
          },
        )
        return (
          <div
            className="py-4 flex justify-between gap-2"
            key={index}
            data-testid="reimbursement-row"
            data-from={getParticipant(reimbursement.from)?.name ?? ''}
            data-to={receiver?.name ?? ''}
          >
            <div className="flex flex-col gap-1 items-start sm:flex-row sm:items-baseline sm:gap-4">
              <div>
                {t.rich('owes', {
                  from: getParticipant(reimbursement.from)?.name ?? '',
                  to: receiver?.name ?? '',
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </div>
              <Button variant="link" asChild className="-mx-4 -my-3">
                <Link href={markAsPaidHref}>{t('markAsPaid')}</Link>
              </Button>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div>{formattedAmount}</div>
              {payOptions.length > 0 && (
                <PayDialog
                  options={payOptions}
                  receiverName={receiver?.name ?? ''}
                  formattedAmount={formattedAmount}
                  markAsPaidHref={markAsPaidHref}
                />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
