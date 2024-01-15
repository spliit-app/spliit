import { getPrisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(
  req: Request,
  { params: { groupId } }: { params: { groupId: string } },
) {
  console.log({ groupId })
  const prisma = await getPrisma()
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
          category: { select: { grouping: true, name: true } },
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
  if (!group)
    return NextResponse.json({ error: 'Invalid group ID' }, { status: 404 })
  return NextResponse.json(group, {
    headers: {
      'content-type': 'application/json',
      'content-disposition': `attachment; filename="${group.name}.json"`,
    },
  })
}
