import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

/**
 * Data Delete API Route (Undo Import)
 *
 * SECURITY NOTE: This application uses a link-sharing model where anyone with
 * the group URL can access and modify the group. There is no user authentication
 * system. This is by design for ease of use in collaborative expense tracking.
 *
 * If you need to secure this application:
 * - Implement an authentication system (e.g., Auth.js, Clerk, etc.)
 * - Add group ownership and permission checks
 * - Consider rate limiting to prevent abuse
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  try {
    const { groupId } = await params
    const { action } = (await req.json()) as { action: 'undo-import' }

    // Verify group exists
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        activities: {
          where: {
            data: {
              startsWith: 'JSON_IMPORT_START:',
            },
          },
          orderBy: { time: 'desc' },
          take: 1,
        },
      },
    })

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    if (action === 'undo-import') {
      // Find the most recent import marker
      const lastImport = group.activities[0]

      if (!lastImport) {
        return NextResponse.json(
          { error: 'No import found to undo' },
          { status: 400 },
        )
      }

      // Extract the import time from the marker (not used, just for clarity)
      const importTime = lastImport.time

      // Find all expenses that were imported during this import session
      // by looking for activities with importDate matching this import
      const importedActivities = await prisma.activity.findMany({
        where: {
          groupId: groupId,
          activityType: 'CREATE_EXPENSE',
          data: {
            contains: `"importDate":"${importTime.toISOString()}"`,
          },
        },
        select: {
          expenseId: true,
        },
      })

      const importedExpenseIds = importedActivities
        .map((a) => a.expenseId)
        .filter((id): id is string => id !== null)

      // Delete all expenses and participants created during the import
      await prisma.$transaction(async (tx) => {
        // Delete expense paid-for entries first (foreign key constraint)
        await tx.expensePaidFor.deleteMany({
          where: {
            expenseId: {
              in: importedExpenseIds,
            },
          },
        })

        // Delete only the expenses that were imported
        await tx.expense.deleteMany({
          where: {
            id: {
              in: importedExpenseIds,
            },
          },
        })

        // Delete participants that are no longer referenced by any remaining expenses
        // This avoids leaving orphaned participants after undoing an import.
        await tx.participant.deleteMany({
          where: {
            groupId: groupId,
            // Only delete participants that have no associated expenses
            expensesPaidBy: {
              none: {},
            },
            expensesPaidFor: {
              none: {},
            },
          },
        })

        // Delete activities from the import
        await tx.activity.deleteMany({
          where: {
            groupId: groupId,
            time: {
              gte: lastImport.time,
            },
          },
        })
      })

      revalidatePath(`/groups/${groupId}`)
      revalidatePath(`/groups/${groupId}/expenses`)
      revalidatePath(`/groups/${groupId}/balances`)
      revalidatePath(`/groups/${groupId}/activity`)

      return NextResponse.json({
        success: true,
        message: 'Successfully undid last import',
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Delete operation error:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
