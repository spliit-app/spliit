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
  { params: { groupId } }: { params: { groupId: string } },
) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      name: true,
      currency: true,
      expenses: {
        select: {
          expenseDate: true,
          title: true,
          category: { select: { name: true } },
          amount: true,
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

  CSV Structure:

  --------------------------------------------------------------
  |   Date   |   Description   |  Category  |  Currency  | Cost  
  --------------------------------------------------------------
  |  Is Reimbursement   |   Split mode   |   UserA   |   UserB   
  --------------------------------------------------------------

  Columns:
  - Date: The date of the expense.
  - Description: A brief description of the expense.
  - Category: The category of the expense (e.g., Food, Travel, etc.).
  - Currency: The currency in which the expense is recorded.
  - Cost: The amount spent.
  - Is Reimbursement: Whether the expense is a reimbursement or not.
  - Split mode: The method used to split the expense (e.g., Evenly, By shares, By percentage, By amount).
  - UserA, UserB: User-specific data or balances (e.g., amount owed or contributed by each user).

  Example Row:
  ------------------------------------------------------------------------------------------
  | 2025-01-06 |  Dinner with team  |  Food  |  ₹  |  5000  |  No  |  Evenly  | John |  Jane 
  ------------------------------------------------------------------------------------------

*/

  const fields = [
    { label: 'Date', value: 'date' },
    { label: 'Description', value: 'title' },
    { label: 'Category', value: 'categoryName' },
    { label: 'Currency', value: 'currency' },
    { label: 'Cost', value: 'amount' },
    { label: 'Is Reimbursement', value: 'isReimbursement' },
    { label: 'Split mode', value: 'splitMode' },
    ...group.participants.map((participant) => ({
      label: participant.name,
      value: participant.name,
    })),
  ]

  const expenses = group.expenses.map((expense) => ({
    date: formatDate(expense.expenseDate),
    title: expense.title,
    categoryName: expense.category?.name || '',
    currency: group.currency,
    amount: (expense.amount / 100).toFixed(2),
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
        const participantAmountShare = +(
          ((expense.amount / totalShares) * participantShare) /
          100
        ).toFixed(2)

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
