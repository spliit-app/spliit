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
}

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
  { params }: { params: Promise<{ groupId: string }> },
) {
  const { groupId } = await params
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      name: true,
      currency: true,
      currencyCode: true,
      expenses: {
        select: {
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
  - Is Reimbursement: Whether the expense is a reimbursement or not.
  - Split mode: The method used to split the expense (e.g., Evenly, By shares, By percentage, By amount).
  - UserA, UserB: User-specific data or balances (e.g., amount owed or contributed by each user).

  Example Table:
  +------------+------------------+----------+----------+----------+---------------+-------------------+-----------------+------------------+----------------------+--------+-----------+
  | Date       | Description      | Category | Currency | Cost     | Original cost | Original currency | Conversion rate | Is reinbursement | Split mode           | User A | User B    |
  +------------+------------------+----------+----------+----------+---------------+-------------------+-----------------+------------------+----------------------+--------+-----------+
  | 2025-01-06 | Dinner with team | Food     | INR      | 5000     |               |                   |                 | No               | Evenly               | 2500   | -2500     |
  +------------+------------------+----------+----------+----------+---------------+-------------------+-----------------+------------------+----------------------+--------+-----------+
  | 2025-02-07 | Plane tickets    | Travel   | INR      | 97264.09 | 1000          | EUR               | 97.2641         | No               | Unevenly - By amount | -80000 | -17264.09 |
  +------------+------------------+----------+----------+----------+---------------+-------------------+-----------------+------------------+----------------------+--------+-----------+

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
    { label: 'Is Reimbursement', value: 'isReimbursement' },
    { label: 'Split mode', value: 'splitMode' },
    ...group.participants.map((participant) => ({
      label: participant.name,
      value: participant.name,
    })),
  ]

  const currency = getCurrencyFromGroup(group)

  const expenses = group.expenses.map((expense) => ({
    date: formatDate(expense.expenseDate),
    title: expense.title,
    categoryName: expense.category?.name || '',
    currency: group.currencyCode ?? group.currency,
    amount: formatAmountAsDecimal(expense.amount, currency),
    originalAmount: expense.originalAmount
      ? formatAmountAsDecimal(
          expense.originalAmount,
          getCurrency(expense.originalCurrency),
        )
      : null,
    originalCurrency: expense.originalCurrency,
    conversionRate: expense.conversionRate
      ? expense.conversionRate.toString()
      : null,
    isReimbursement: expense.isReimbursement ? 'Yes' : 'No',
    splitMode: splitModeLabel[expense.splitMode],
    ...Object.fromEntries(
      group.participants.map((participant) => {
        const { totalShares, participantShare } = expense.paidFor.reduce(
          (acc, { participantId, shares }) => {
            acc.totalShares += shares
            if (participantId === participant.id) {
              acc.participantShare = shares
            }
            return acc
          },
          { totalShares: 0, participantShare: 0 },
        )

        const isPaidByParticipant = expense.paidById === participant.id
        const participantAmountShare = +formatAmountAsDecimal(
          (expense.amount / totalShares) * participantShare,
          currency,
        )

        return [
          participant.name,
          participantAmountShare * (isPaidByParticipant ? 1 : -1),
        ]
      }),
    ),
  }))

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
