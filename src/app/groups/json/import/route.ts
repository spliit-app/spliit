import {
  JSONImportData,
  VersionComparisonResult,
  calculateJSONDifferences,
  compareJSONVersions,
  restoreGroupFromJSON,
} from '@/lib/json-import'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

/**
 * JSON Import API Route
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
export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const action = formData.get('action') as string // 'analyze' | 'restore' | 'rollback'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file size (max 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 },
      )
    }

    // Read the JSON file
    const text = await file.text()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const jsonData: JSONImportData = JSON.parse(
      text,
    ) as unknown as JSONImportData

    // Validate JSON data
    if (
      !jsonData.id ||
      !jsonData.name ||
      !jsonData.participants ||
      !jsonData.expenses
    ) {
      return NextResponse.json(
        {
          error:
            'Invalid JSON file format. Expected Spliit export format with id, name, participants, and expenses.',
        },
        { status: 400 },
      )
    }

    // Check if group exists
    const existingGroup = await prisma.group.findUnique({
      where: { id: jsonData.id },
      include: {
        participants: { select: { id: true } },
        expenses: { select: { id: true, createdAt: true, expenseDate: true } },
        activities: { select: { time: true } },
      },
    })

    const comparison = compareJSONVersions(jsonData, existingGroup)

    // If action is 'analyze', just return the comparison
    if (action === 'analyze') {
      let differences
      if (existingGroup) {
        differences = calculateJSONDifferences(jsonData, existingGroup)
      }

      return NextResponse.json({
        success: true,
        comparison: {
          result: comparison.result,
          existingGroupUpdatedAt:
            comparison.existingGroupUpdatedAt?.toISOString(),
          jsonExportedAt: comparison.jsonExportedAt.toISOString(),
          differences,
        },
        groupName: jsonData.name,
        warnings: [
          'JSON import has limitations:',
          '• Activity history is not preserved, it will be regenerated',
          '• Document attachments will not be imported',
          '• Notes on expenses will not be imported',
          '• Recurring expense links will not be imported',
          '• Only basic expense data will be restored',
        ],
      })
    }

    // Handle restore/rollback actions
    if (action === 'restore' || action === 'rollback') {
      let mode: 'create' | 'update' | 'rollback'

      if (comparison.result === VersionComparisonResult.NOT_FOUND) {
        mode = 'create'
      } else if (action === 'rollback') {
        mode = 'rollback'
      } else if (comparison.result === VersionComparisonResult.NEWER) {
        mode = 'update'
      } else {
        return NextResponse.json(
          {
            error:
              'JSON export is not newer than existing group. Use rollback to restore older version.',
          },
          { status: 400 },
        )
      }

      // Execute restore in a transaction (increase timeout for large imports)
      await prisma.$transaction(
        async (tx) => {
          await restoreGroupFromJSON(tx, jsonData, mode)
        },
        { timeout: 60000, maxWait: 20000 },
      )
      // Revalidate the group pages to ensure fresh data is loaded
      revalidatePath(`/groups/${jsonData.id}`)
      revalidatePath(`/groups/${jsonData.id}/expenses`)
      revalidatePath(`/groups/${jsonData.id}/balances`)
      revalidatePath('/groups')

      return NextResponse.json({
        success: true,
        message: `Group ${
          mode === 'create'
            ? 'created'
            : mode === 'rollback'
            ? 'rolled back'
            : 'updated'
        } successfully`,
        groupId: jsonData.id,
        mode,
      })
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "analyze", "restore", or "rollback"' },
      { status: 400 },
    )
  } catch (error) {
    console.error('JSON import error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process JSON file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
