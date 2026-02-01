import { Prisma } from '@prisma/client'

const MAX_URL_CHECK_RETRIES = 3
const INITIAL_URL_CHECK_BACKOFF_MS = 200

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Creates a unique key for a category using grouping and name.
 * Uses the unit separator control character (\x1F) as a delimiter to avoid
 * conflicts with user input that might contain common delimiters like colons.
 */
function createCategoryKey(grouping: string, name: string): string {
  return `${grouping}\x1F${name}`
}

/**
 * Parses a category key back into grouping and name components.
 */
function parseCategoryKey(key: string): { grouping: string; name: string } {
  const parts = key.split('\x1F')
  if (parts.length !== 2) {
    throw new Error(
      `Invalid category key format: expected 2 parts, got ${parts.length}`,
    )
  }
  const [grouping, name] = parts
  return { grouping, name }
}

// Helper to check if a URL is accessible
async function checkUrlExists(url: string): Promise<boolean> {
  let backoffMs = INITIAL_URL_CHECK_BACKOFF_MS

  for (let attempt = 0; attempt <= MAX_URL_CHECK_RETRIES; attempt++) {
    try {
      const response = await fetch(url, { method: 'HEAD' })

      if (response.ok) {
        // URL is accessible
        return true
      }

      // If we are being rate limited, optionally retry with backoff
      if (response.status === 429 && attempt < MAX_URL_CHECK_RETRIES) {
        await sleep(backoffMs)
        backoffMs *= 2
        continue
      }

      // For non-OK responses other than 429, keep original behavior
      return false
    } catch {
      // Network or other transient error: retry with backoff if attempts remain
      if (attempt < MAX_URL_CHECK_RETRIES) {
        await sleep(backoffMs)
        backoffMs *= 2
        continue
      }

      return false
    }
  }

  return false
}

export type BackupData = {
  version: string
  exportedAt: string
  group: {
    id: string
    name: string
    information: string | null
    currency: string
    currencyCode: string | null
    createdAt: string
  }
  participants: Array<{
    id: string
    name: string
  }>
  expenses: Array<{
    id: string
    expenseDate: string
    createdAt: string
    title: string
    category: {
      id: number
      name: string
      grouping: string
    } | null
    amount: number
    originalAmount: number | null
    originalCurrency: string | null
    conversionRate: string | null
    paidById: string
    paidFor: Array<{
      participantId: string
      shares: number
    }>
    isReimbursement: boolean
    splitMode: string
    notes: string | null
    documents: Array<{
      id: string
      url: string
      width: number
      height: number
    }>
    recurrenceRule: string | null
    recurringExpenseLink: {
      id: string
      nextExpenseCreatedAt: string | null
      nextExpenseDate: string
    } | null
  }>
  activities: Array<{
    id: string
    time: string
    activityType: string
    participantId: string | null
    expenseId: string | null
    data: string | null
  }>
}

export enum VersionComparisonResult {
  NEWER = 'NEWER', // Backup is newer than existing group
  OLDER = 'OLDER', // Backup is older than existing group
  SAME = 'SAME', // Same version
  NOT_FOUND = 'NOT_FOUND', // Group doesn't exist
}

export type GroupComparison = {
  result: VersionComparisonResult
  existingGroupUpdatedAt?: Date
  backupExportedAt: Date
  differences?: {
    addedExpenses: number
    removedExpenses: number
    modifiedExpenses: number
    addedParticipants: number
    removedParticipants: number
  }
}

/**
 * Compare backup timestamp with existing group data
 */
export function compareVersions(
  backupData: BackupData,
  existingGroup: {
    createdAt: Date
    expenses: Array<{ createdAt: Date }>
    activities: Array<{ time: Date }>
  } | null,
): GroupComparison {
  const backupExportedAt = new Date(backupData.exportedAt)

  if (!existingGroup) {
    return {
      result: VersionComparisonResult.NOT_FOUND,
      backupExportedAt,
    }
  }

  // Get the latest update time from existing group (most recent expense or activity)
  const latestExpenseTime =
    existingGroup.expenses.length > 0
      ? new Date(
          Math.max(...existingGroup.expenses.map((e) => e.createdAt.getTime())),
        )
      : existingGroup.createdAt

  const latestActivityTime =
    existingGroup.activities.length > 0
      ? new Date(
          Math.max(...existingGroup.activities.map((a) => a.time.getTime())),
        )
      : existingGroup.createdAt

  const existingGroupUpdatedAt = new Date(
    Math.max(latestExpenseTime.getTime(), latestActivityTime.getTime()),
  )

  // Compare timestamps
  if (backupExportedAt > existingGroupUpdatedAt) {
    return {
      result: VersionComparisonResult.NEWER,
      existingGroupUpdatedAt,
      backupExportedAt,
    }
  } else if (backupExportedAt < existingGroupUpdatedAt) {
    return {
      result: VersionComparisonResult.OLDER,
      existingGroupUpdatedAt,
      backupExportedAt,
    }
  } else {
    return {
      result: VersionComparisonResult.SAME,
      existingGroupUpdatedAt,
      backupExportedAt,
    }
  }
}

/**
 * Calculate differences between backup and existing group
 */
export function calculateDifferences(
  backupData: BackupData,
  existingGroup: {
    participants: Array<{ id: string }>
    expenses: Array<{ id: string }>
  },
) {
  const backupExpenseIds = new Set(backupData.expenses.map((e) => e.id))
  const existingExpenseIds = new Set(existingGroup.expenses.map((e) => e.id))

  const backupParticipantIds = new Set(backupData.participants.map((p) => p.id))
  const existingParticipantIds = new Set(
    existingGroup.participants.map((p) => p.id),
  )

  return {
    addedExpenses: backupData.expenses.filter(
      (e) => !existingExpenseIds.has(e.id),
    ).length,
    removedExpenses: existingGroup.expenses.filter(
      (e) => !backupExpenseIds.has(e.id),
    ).length,
    modifiedExpenses: 0, // Could implement deep comparison if needed
    addedParticipants: backupData.participants.filter(
      (p) => !existingParticipantIds.has(p.id),
    ).length,
    removedParticipants: existingGroup.participants.filter(
      (p) => !backupParticipantIds.has(p.id),
    ).length,
  }
}

/**
 * Restore group from backup data
 */
export async function restoreGroupFromBackup(
  prisma: Prisma.TransactionClient,
  backupData: BackupData,
  mode: 'create' | 'update' | 'rollback',
): Promise<{ success: boolean; warnings: string[] }> {
  const { group, participants, expenses, activities } = backupData
  const warnings: string[] = []

  if (mode === 'create') {
    // Create new group with all data
    await prisma.group.create({
      data: {
        id: group.id,
        name: group.name,
        information: group.information,
        currency: group.currency,
        currencyCode: group.currencyCode,
        createdAt: new Date(group.createdAt),
      },
    })
  } else if (mode === 'rollback') {
    // Delete all existing data and recreate
    await prisma.activity.deleteMany({ where: { groupId: group.id } })
    await prisma.expense.deleteMany({ where: { groupId: group.id } })
    await prisma.participant.deleteMany({ where: { groupId: group.id } })

    // Update group metadata
    await prisma.group.update({
      where: { id: group.id },
      data: {
        name: group.name,
        information: group.information,
        currency: group.currency,
        currencyCode: group.currencyCode,
      },
    })
  }

  // Create/restore participants
  if (mode === 'create' || mode === 'rollback') {
    // Use createMany for batch insert
    await prisma.participant.createMany({
      data: participants.map((participant) => ({
        id: participant.id,
        name: participant.name,
        groupId: group.id,
      })),
      skipDuplicates: true,
    })
  } else if (mode === 'update') {
    // In update mode, only add missing participants
    const existingParticipants = await prisma.participant.findMany({
      where: { groupId: group.id },
      select: { id: true },
    })
    const existingIds = new Set(existingParticipants.map((p) => p.id))

    const newParticipants = participants.filter((p) => !existingIds.has(p.id))
    if (newParticipants.length > 0) {
      await prisma.participant.createMany({
        data: newParticipants.map((participant) => ({
          id: participant.id,
          name: participant.name,
          groupId: group.id,
        })),
        skipDuplicates: true,
      })
    }
  }

  // Ensure all categories from the backup exist in the database
  const categoryMap = new Map<number, number>() // Maps old category ID to new/existing category ID
  const uniqueCategories = new Map<
    string,
    { grouping: string; name: string; id: number }
  >()

  for (const expense of expenses) {
    if (expense.category && expense.category.id > 0) {
      const categoryKey = createCategoryKey(
        expense.category.grouping,
        expense.category.name,
      )
      if (!uniqueCategories.has(categoryKey)) {
        uniqueCategories.set(categoryKey, expense.category)
      }
    }
  }

  for (const [categoryKey, backupCategory] of uniqueCategories) {
    const { grouping, name } = parseCategoryKey(categoryKey)

    // Try to find existing category with same grouping and name
    let category = await prisma.category.findFirst({
      where: { grouping, name },
    })

    // Create if it doesn't exist
    if (!category) {
      category = await prisma.category.create({
        data: { grouping, name },
      })
    }

    // Map the backup category ID to the actual database category ID
    categoryMap.set(backupCategory.id, category.id)
  }

  // Create/restore expenses
  if (mode === 'create' || mode === 'rollback') {
    // Batch create expenses first
    await prisma.expense.createMany({
      data: expenses.map((expense) => {
        // Use the mapped category ID if available, otherwise use 0 (uncategorized)
        const categoryId = expense.category?.id
          ? categoryMap.get(expense.category.id) ?? 0
          : 0

        return {
          id: expense.id,
          groupId: group.id,
          expenseDate: new Date(expense.expenseDate),
          createdAt: new Date(expense.createdAt),
          title: expense.title,
          categoryId,
          amount: expense.amount,
          originalAmount: expense.originalAmount,
          originalCurrency: expense.originalCurrency,
          conversionRate: expense.conversionRate
            ? new Prisma.Decimal(expense.conversionRate)
            : null,
          paidById: expense.paidById,
          isReimbursement: expense.isReimbursement,
          splitMode: expense.splitMode as any,
          notes: expense.notes,
          recurrenceRule: expense.recurrenceRule as any,
        }
      }),
      skipDuplicates: true,
    })

    // Batch create paidFor relations
    const allPaidFor: Array<{
      expenseId: string
      participantId: string
      shares: number
    }> = []
    for (const expense of expenses) {
      for (const paidFor of expense.paidFor) {
        allPaidFor.push({
          expenseId: expense.id,
          participantId: paidFor.participantId,
          shares: paidFor.shares,
        })
      }
    }
    if (allPaidFor.length > 0) {
      await prisma.expensePaidFor.createMany({
        data: allPaidFor,
        skipDuplicates: true,
      })
    }

    // Documents and recurring links still need individual handling due to URL checks
    for (const expense of expenses) {
      // Create documents (check if URLs exist first)
      for (const doc of expense.documents) {
        const urlExists = await checkUrlExists(doc.url)
        if (urlExists) {
          // Use upsert to handle existing documents
          await prisma.expenseDocument.upsert({
            where: { id: doc.id },
            create: {
              id: doc.id,
              url: doc.url,
              width: doc.width,
              height: doc.height,
              expenseId: expense.id,
            },
            update: {
              url: doc.url,
              width: doc.width,
              height: doc.height,
              expenseId: expense.id,
            },
          })
        } else {
          warnings.push(
            `Document not found for expense "${expense.title}": ${doc.url}`,
          )
        }
      }

      // Create recurring expense link if exists
      if (expense.recurringExpenseLink) {
        await prisma.recurringExpenseLink.create({
          data: {
            id: expense.recurringExpenseLink.id,
            groupId: group.id,
            currentFrameExpenseId: expense.id,
            nextExpenseCreatedAt: expense.recurringExpenseLink
              .nextExpenseCreatedAt
              ? new Date(expense.recurringExpenseLink.nextExpenseCreatedAt)
              : null,
            nextExpenseDate: new Date(
              expense.recurringExpenseLink.nextExpenseDate,
            ),
          },
        })
      }
    }
  } else if (mode === 'update') {
    // In update mode, only add missing expenses
    const existingExpenses = await prisma.expense.findMany({
      where: { groupId: group.id },
      select: { id: true },
    })
    const existingIds = new Set(existingExpenses.map((e) => e.id))

    const newExpenses = expenses.filter((e) => !existingIds.has(e.id))

    if (newExpenses.length > 0) {
      // Batch create new expenses with mapped category IDs
      await prisma.expense.createMany({
        data: newExpenses.map((expense) => {
          // Use the mapped category ID if available, otherwise use 0 (uncategorized)
          const categoryId = expense.category?.id
            ? categoryMap.get(expense.category.id) ?? 0
            : 0

          return {
            id: expense.id,
            groupId: group.id,
            expenseDate: new Date(expense.expenseDate),
            createdAt: new Date(expense.createdAt),
            title: expense.title,
            categoryId,
            amount: expense.amount,
            originalAmount: expense.originalAmount,
            originalCurrency: expense.originalCurrency,
            conversionRate: expense.conversionRate
              ? new Prisma.Decimal(expense.conversionRate)
              : null,
            paidById: expense.paidById,
            isReimbursement: expense.isReimbursement,
            splitMode: expense.splitMode as any,
            notes: expense.notes,
            recurrenceRule: expense.recurrenceRule as any,
          }
        }),
        skipDuplicates: true,
      })

      // Batch create paidFor relations for new expenses
      const allPaidFor: Array<{
        expenseId: string
        participantId: string
        shares: number
      }> = []
      for (const expense of newExpenses) {
        for (const paidFor of expense.paidFor) {
          allPaidFor.push({
            expenseId: expense.id,
            participantId: paidFor.participantId,
            shares: paidFor.shares,
          })
        }
      }
      if (allPaidFor.length > 0) {
        await prisma.expensePaidFor.createMany({
          data: allPaidFor,
          skipDuplicates: true,
        })
      }

      // Handle documents for new expenses
      for (const expense of newExpenses) {
        for (const doc of expense.documents) {
          const urlExists = await checkUrlExists(doc.url)
          if (urlExists) {
            // Use upsert to handle existing documents
            await prisma.expenseDocument.upsert({
              where: { id: doc.id },
              create: {
                id: doc.id,
                url: doc.url,
                width: doc.width,
                height: doc.height,
                expenseId: expense.id,
              },
              update: {
                url: doc.url,
                width: doc.width,
                height: doc.height,
                expenseId: expense.id,
              },
            })
          } else {
            warnings.push(
              `Document not found for expense "${expense.title}": ${doc.url}`,
            )
          }
        }
      }
    }
  }

  // Restore activities
  if (mode === 'create' || mode === 'rollback') {
    for (const activity of activities) {
      await prisma.activity.create({
        data: {
          id: activity.id,
          groupId: group.id,
          time: new Date(activity.time),
          activityType: activity.activityType as any,
          participantId: activity.participantId,
          expenseId: activity.expenseId,
          data: activity.data,
        },
      })
    }
  }

  return { success: true, warnings }
}
