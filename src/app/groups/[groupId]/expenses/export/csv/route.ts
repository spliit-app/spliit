import { getCurrency } from '@/lib/currency'
import { formatAmountAsDecimal, getCurrencyFromGroup } from '@/lib/utils'
import { Parser } from '@json2csv/plainjs'
import { PrismaClient } from '@prisma/client'
import contentDisposition from 'content-disposition'
import { NextResponse } from 'next/server'

const splitModeLabel = {
  EVENLY: 'Evenly',
  BY_SHARES: 'Unevenly – By shares',
  BY_PERCENTAGE: 'Unevenly – By percentage',
  BY_AMOUNT: 'Unevenly – By amount',
} as const

function formatDate(isoDateString: Date): string {
  const date = new Date(isoDateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0') // Months are zero-based
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}` // YYYY-MM-DD format
}

const prisma = new PrismaClient()

export async function GET(
  req: Request,
  { params: { groupId } }: { params: { groupId: string } },
) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      name: true,
      currency: true,
      currencyCode: true,
      expenses: {
        select: {
          createdAt: true,
          expenseDate: true,
          title: true,
          category: { select: { name: true } },
          amount: true,
          originalAmount: true,
          originalCurrency: true,
          conversionRate: true,
          paidById: true,
          paidFor: { select: { participantId: true, shares: true } },
          isReimbursement: true,
          splitMode: true,
        },
        orderBy: [{ expenseDate: 'asc' }, { createdAt: 'asc' }],
      },
      participants: { select: { id: true, name: true } },
    },
  })

  if (!group) {
    return NextResponse.json({ error: 'Invalid group ID' }, { status: 404 })
  }

  /*

  CSV Columns:
  - Date: The date of the expense.
  - Description: A brief description of the expense.
  - Category: The category of the expense (e.g., Food, Travel, etc.).
  - Currency: The currency in which the expense is recorded.
  - Cost: The amount spent.
  - Original cost: The amount spent in the original currency.
  - Original currency: The currency the amount was originally spent in.
  - Conversion rate: The rate used to convert the amount.
  - Split mode: The method used to split the expense (e.g., Evenly, By shares, By percentage, By amount).
  - Paid By: The paying user
  - UserA, UserB: Per-participant saldo for this expense (payer advances vs owed amount). Saldos per row sum to 0.

  Example Table:
  +------------+------------------+----------+----------+----------+---------------+-------------------+-----------------+----------------------+----------+--------+-----------+
  | Date       | Description      | Category | Currency | Cost     | Original cost | Original currency | Conversion rate | Split mode           | Paid By  | User A | User B    |
  +------------+------------------+----------+----------+----------+---------------+-------------------+-----------------+----------------------+----------+--------+-----------+
  | 2025-01-06 | Dinner with team | Food     | INR      | 5000     |               |                   |                 | Evenly               | User A   | 2500   | -2500     |
  +------------+------------------+----------+----------+----------+---------------+-------------------+-----------------+----------------------+----------+--------+-----------+
  | 2025-02-07 | Plane tickets    | Travel   | INR      | 97264.09 | 1000          | EUR               | 97.2641         | Unevenly - By amount | User B   | -80000 | -17264.09 |
  +------------+------------------+----------+----------+----------+---------------+-------------------+-----------------+----------------------+----------+--------+-----------+

  */

  const fields = [
    { label: 'Date', value: 'date' },
    { label: 'Description', value: 'title' },
    { label: 'Category', value: 'categoryName' },
    { label: 'Currency', value: 'currency' },
    { label: 'Cost', value: 'amount' },
    { label: 'Original cost', value: 'originalAmount' },
    { label: 'Original currency', value: 'originalCurrency' },
    { label: 'Conversion rate', value: 'conversionRate' },
    { label: 'Split mode', value: 'splitMode' },
    { label: 'Paid By', value: 'paidBy' },
    ...group.participants.map((participant) => ({
      label: participant.name,
      value: participant.name,
    })),
  ]

  const currency = getCurrencyFromGroup(group)

  const participantIdNameMap = Object.fromEntries(
    group.participants.map((p) => [p.id, p.name]),
  ) as Record<string, string>

  const expenses = group.expenses.map((expense) => {
    const normalizedAmount = Number(expense.amount)
    const normalizedOriginalAmount = expense.originalAmount
      ? Number(expense.originalAmount)
      : null
    const normalizedConversionRate = expense.conversionRate
      ? Number(expense.conversionRate)
      : null

    // Total amount of the expense in major currency units (e.g. cents -> dollars)
    // This is used to compute the payer's net saldo for this single expense.
    const totalAmount = +formatAmountAsDecimal(normalizedAmount, currency)
    // Map of participantId -> shares for quick lookups when building saldos.
    const shareByParticipant = Object.fromEntries(
      expense.paidFor.map(({ participantId, shares }) => [
        participantId,
        shares,
      ]),
    ) as Record<string, number>
    const totalShares = expense.paidFor.reduce(
      (sum, { shares }) => sum + shares,
      0,
    )

    return {
      date: formatDate(expense.expenseDate),
      title: expense.title,
      categoryName: expense.category?.name || '',
      currency: group.currencyCode ?? group.currency,
      // Costs should not count reimbursements as spending in CSV totals
      amount: formatAmountAsDecimal(
        expense.isReimbursement ? 0 : normalizedAmount,
        currency,
      ),
      originalAmount: normalizedOriginalAmount
        ? formatAmountAsDecimal(
            normalizedOriginalAmount,
            getCurrency(expense.originalCurrency),
          )
        : null,
      originalCurrency: expense.originalCurrency,
      conversionRate: normalizedConversionRate
        ? normalizedConversionRate.toString()
        : null,
      paidBy: participantIdNameMap[expense.paidById],
      splitMode: splitModeLabel[expense.splitMode],
      // For every participant we export the *saldo* (net effect) of this single expense:
      // - For the paying participant (paidBy):
      //     saldo = totalAmount - participantShareAmount
      //   -> how much they effectively advance for others.
      // - For all other participants:
      //     saldo = -participantShareAmount
      //   -> how much they owe to the payer for this expense.
      //
      // The sum of all participant saldos for a given expense is always 0,
      // which makes the CSV easy to aggregate in tools like Excel.
      ...Object.fromEntries(
        group.participants.map((participant) => {
          const participantShare = shareByParticipant[participant.id] ?? 0

          const participantShareAmount =
            totalShares === 0
              ? 0
              : +formatAmountAsDecimal(
                  (normalizedAmount / totalShares) * participantShare,
                  currency,
                )

          const isPaidByParticipant = expense.paidById === participant.id
          const saldo = isPaidByParticipant
            ? totalAmount - participantShareAmount
            : -participantShareAmount

          return [participant.name, saldo]
        }),
      ),
    }
  })

  const json2csvParser = new Parser({ fields })
  const csv = json2csvParser.parse(expenses)

  const date = new Date().toISOString().split('T')[0]
  const filename = `Spliit Export - ${group.name} - ${date}.csv`

  // \uFEFF character is added at the beginning of the CSV content to ensure that it is interpreted as UTF-8 with BOM (Byte Order Mark), which helps some applications correctly interpret the encoding.
  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': contentDisposition(filename),
    },
  })
}
