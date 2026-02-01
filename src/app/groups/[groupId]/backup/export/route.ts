import { prisma } from '@/lib/prisma'
import contentDisposition from 'content-disposition'
import JSZip from 'jszip'
import { NextResponse } from 'next/server'

/**
 * Backup Export API Route
 *
 * SECURITY NOTE: This application uses a link-sharing model where anyone with
 * the group URL can access and export the group data. There is no user authentication
 * system. This is by design for ease of use in collaborative expense tracking.
 *
 * If you need to secure this application:
 * - Implement an authentication system (e.g., Auth.js, Clerk, etc.)
 * - Add group ownership and permission checks
 * - Consider rate limiting to prevent abuse
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const { groupId } = await params

  // Fetch complete group data including all relations
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      participants: true,
      expenses: {
        include: {
          category: true,
          paidFor: true,
          documents: true,
          recurringExpenseLink: true,
        },
        orderBy: [{ expenseDate: 'asc' }, { createdAt: 'asc' }],
      },
      activities: {
        orderBy: { time: 'asc' },
      },
    },
  })

  if (!group) {
    return NextResponse.json({ error: 'Invalid group ID' }, { status: 404 })
  }

  // Create backup metadata
  const backup = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    group: {
      id: group.id,
      name: group.name,
      information: group.information,
      currency: group.currency,
      currencyCode: group.currencyCode,
      createdAt: group.createdAt.toISOString(),
    },
    participants: group.participants.map((p) => ({
      id: p.id,
      name: p.name,
    })),
    expenses: group.expenses.map((e) => ({
      id: e.id,
      expenseDate: e.expenseDate.toISOString(),
      createdAt: e.createdAt.toISOString(),
      title: e.title,
      category: e.category
        ? {
            id: e.category.id,
            name: e.category.name,
            grouping: e.category.grouping,
          }
        : null,
      amount: e.amount,
      originalAmount: e.originalAmount,
      originalCurrency: e.originalCurrency,
      conversionRate: e.conversionRate?.toString(),
      paidById: e.paidById,
      paidFor: e.paidFor.map((pf) => ({
        participantId: pf.participantId,
        shares: pf.shares,
      })),
      isReimbursement: e.isReimbursement,
      splitMode: e.splitMode,
      notes: e.notes,
      documents: e.documents.map((d) => ({
        id: d.id,
        url: d.url,
        width: d.width,
        height: d.height,
      })),
      recurrenceRule: e.recurrenceRule,
      recurringExpenseLink: e.recurringExpenseLink
        ? {
            id: e.recurringExpenseLink.id,
            nextExpenseCreatedAt:
              e.recurringExpenseLink.nextExpenseCreatedAt?.toISOString(),
            nextExpenseDate:
              e.recurringExpenseLink.nextExpenseDate.toISOString(),
          }
        : null,
    })),
    activities: group.activities.map((a) => ({
      id: a.id,
      time: a.time.toISOString(),
      activityType: a.activityType,
      participantId: a.participantId,
      expenseId: a.expenseId,
      data: a.data,
    })),
  }

  // Create a zip file
  const zip = new JSZip()
  zip.file('backup.json', JSON.stringify(backup, null, 2))

  // Add metadata file
  zip.file(
    'metadata.json',
    JSON.stringify(
      {
        version: backup.version,
        exportedAt: backup.exportedAt,
        groupId: group.id,
        groupName: group.name,
      },
      null,
      2,
    ),
  )

  // Generate zip buffer
  const zipBuffer = Buffer.from(
    await zip.generateAsync({ type: 'arraybuffer' }),
  )

  const date = new Date().toISOString().split('T')[0]
  const filename = `Spliit-Backup-${group.name}-${date}.zip`

  return new NextResponse(zipBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': contentDisposition(filename),
    },
  })
}
