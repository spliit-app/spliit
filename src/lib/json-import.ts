import { Prisma, RecurrenceRule, SplitMode } from '@prisma/client'
import { randomUUID } from 'crypto'
import { buildImportMarkerData } from './import-marker'

/**
 * Creates a unique key for a category using grouping and name.
 * Uses the unit separator control character (\x1F) as a delimiter to avoid
 * conflicts with user input that might contain common delimiters like colons.
 */
function createCategoryKey(grouping: string, name: string): string {
  return `${grouping}\x1F${name}`
}

const EXPENSE_KEY_DELIMITER = '\x1E'
const PAID_FOR_DELIMITER = '\x1D'

function normalizeExpenseDate(value: string | Date): string {
  return new Date(value).toISOString()
}

function createPaidForKey(
  paidFor: Array<{ participantId: string; shares: number }>,
): string {
  if (!paidFor.length) return ''
  return paidFor
    .slice()
    .sort(
      (a, b) =>
        a.participantId.localeCompare(b.participantId) || a.shares - b.shares,
    )
    .map((pf) => `${pf.participantId}:${pf.shares}`)
    .join(PAID_FOR_DELIMITER)
}

function joinExpenseKey(parts: string[]): string {
  return parts.join(EXPENSE_KEY_DELIMITER)
}

function createExpenseBaseKey(expense: {
  expenseDate: string | Date
  title: string
  amount: number
  paidById: string
}): string {
  return joinExpenseKey([
    normalizeExpenseDate(expense.expenseDate),
    expense.title,
    expense.amount.toString(),
    expense.paidById,
  ])
}

function createExpenseMergeKey(expense: {
  expenseDate: string | Date
  title: string
  amount: number
  paidById: string
  splitMode?: string | null
  category?: { grouping: string; name: string } | null
  paidFor?: Array<{ participantId: string; shares: number }>
}): string {
  const categoryKey = expense.category
    ? createCategoryKey(expense.category.grouping, expense.category.name)
    : ''
  const paidForKey = createPaidForKey(expense.paidFor ?? [])
  return joinExpenseKey([
    createExpenseBaseKey(expense),
    expense.splitMode ?? 'EVENLY',
    categoryKey,
    paidForKey,
  ])
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

// Type for the standard JSON export format
export type JSONImportData = {
  id: string
  name: string
  currency: string
  currencyCode: string | null
  expenses: Array<{
    createdAt: string
    expenseDate: string
    title: string
    category: {
      grouping: string
      name: string
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
    recurrenceRule: string | null
  }>
  participants: Array<{
    id: string
    name: string
  }>
}

export enum VersionComparisonResult {
  NEWER = 'NEWER',
  OLDER = 'OLDER',
  SAME = 'SAME',
  NOT_FOUND = 'NOT_FOUND',
}

export type VersionComparison = {
  result: VersionComparisonResult
  existingGroupUpdatedAt?: Date
  jsonExportedAt: Date
  mergeable?: boolean
}

export type JSONGroupComparison = {
  addedExpenses: number
  removedExpenses: number
  modifiedExpenses: number
  addedParticipants: number
  removedParticipants: number
}

export type JSONExpenseConflict = {
  index: number
  expenseDate: string
  title: string
  amount: number
  paidById: string
  paidByName?: string
  jsonCategory?: string | null
  existingCategory?: string | null
  jsonSplitMode: string
  existingSplitMode: string
  jsonPaidFor: string[]
  existingPaidFor: string[]
  differences: Array<'category' | 'splitMode' | 'paidFor'>
}

type ExistingGroup = {
  participants: Array<{ id: string; name: string }>
  expenses: Array<{
    id: string
    createdAt: Date
    expenseDate: Date
    title: string
    amount: number
    paidById: string
    splitMode: SplitMode
    category: { grouping: string; name: string } | null
    paidFor: Array<{ participantId: string; shares: number }>
  }>
  activities: Array<{ time: Date }>
}

function mapSplitMode(value: string): SplitMode {
  switch (value) {
    case 'BY_SHARES':
      return SplitMode.BY_SHARES
    case 'BY_PERCENTAGE':
      return SplitMode.BY_PERCENTAGE
    case 'BY_AMOUNT':
      return SplitMode.BY_AMOUNT
    case 'EVENLY':
    default:
      return SplitMode.EVENLY
  }
}

function mapRecurrenceRule(value: string | null): RecurrenceRule {
  switch (value) {
    case 'DAILY':
      return RecurrenceRule.DAILY
    case 'WEEKLY':
      return RecurrenceRule.WEEKLY
    case 'MONTHLY':
      return RecurrenceRule.MONTHLY
    case 'NONE':
    default:
      return RecurrenceRule.NONE
  }
}

/**
 * Compare JSON export version with existing group
 */
export function compareJSONVersions(
  jsonData: JSONImportData,
  existingGroup: ExistingGroup | null,
): VersionComparison {
  // Use the latest expense date as the JSON "export date"
  const latestExpenseDate =
    jsonData.expenses.length > 0
      ? new Date(
        Math.max(
          ...jsonData.expenses.map((e) => new Date(e.expenseDate).getTime()),
        ),
      )
      : new Date(0)

  if (!existingGroup) {
    return {
      result: VersionComparisonResult.NOT_FOUND,
      jsonExportedAt: latestExpenseDate,
    }
  }

  // Get the latest timestamp from existing group (latest expense or activity)
  const latestExpense =
    existingGroup.expenses.length > 0
      ? new Date(
        Math.max(
          ...existingGroup.expenses.map((e) => e.expenseDate.getTime()),
        ),
      )
      : null

  const latestActivity =
    existingGroup.activities.length > 0
      ? new Date(
        Math.max(...existingGroup.activities.map((a) => a.time.getTime())),
      )
      : null

  const existingGroupUpdatedAt =
    latestExpense && latestActivity
      ? new Date(Math.max(latestExpense.getTime(), latestActivity.getTime()))
      : latestExpense || latestActivity || new Date(0)

  const existingExpenseKeys = new Set(
    existingGroup.expenses.map((expense) => createExpenseMergeKey(expense)),
  )
  const hasMissingExpenses = jsonData.expenses.some(
    (expense) => !existingExpenseKeys.has(createExpenseMergeKey(expense)),
  )
  const existingParticipantIds = new Set(
    existingGroup.participants.map((p) => p.id),
  )
  const hasMissingParticipants = jsonData.participants.some(
    (p) => !existingParticipantIds.has(p.id),
  )
  const mergeable = hasMissingExpenses || hasMissingParticipants

  // Compare timestamps
  if (latestExpenseDate.getTime() > existingGroupUpdatedAt.getTime()) {
    return {
      result: VersionComparisonResult.NEWER,
      existingGroupUpdatedAt,
      jsonExportedAt: latestExpenseDate,
      mergeable,
    }
  } else if (latestExpenseDate.getTime() < existingGroupUpdatedAt.getTime()) {
    return {
      result: VersionComparisonResult.OLDER,
      existingGroupUpdatedAt,
      jsonExportedAt: latestExpenseDate,
      mergeable,
    }
  } else {
    return {
      result: VersionComparisonResult.SAME,
      existingGroupUpdatedAt,
      jsonExportedAt: latestExpenseDate,
      mergeable,
    }
  }
}

/**
 * Calculate differences between JSON import and existing group
 */
export function calculateJSONDifferences(
  jsonData: JSONImportData,
  existingGroup: ExistingGroup,
): JSONGroupComparison {
  const existingParticipantIds = new Set(
    existingGroup.participants.map((p) => p.id),
  )

  const existingExpenseKeys = new Set(
    existingGroup.expenses.map((expense) => createExpenseMergeKey(expense)),
  )

  const jsonExpenseKeys = new Set(
    jsonData.expenses.map((expense) => createExpenseMergeKey(expense)),
  )

  const addedExpenses = jsonData.expenses.filter(
    (expense) => !existingExpenseKeys.has(createExpenseMergeKey(expense)),
  ).length

  const removedExpenses = existingGroup.expenses.filter(
    (expense) => !jsonExpenseKeys.has(createExpenseMergeKey(expense)),
  ).length

  const addedParticipants = jsonData.participants.filter(
    (p) => !existingParticipantIds.has(p.id),
  ).length

  const removedParticipants = existingGroup.participants.filter(
    (p) => !jsonData.participants.some((jp) => jp.id === p.id),
  ).length

  return {
    addedExpenses,
    removedExpenses,
    modifiedExpenses: 0, // Cannot accurately determine from JSON
    addedParticipants,
    removedParticipants,
  }
}

export function calculateJSONConflicts(
  jsonData: JSONImportData,
  existingGroup: ExistingGroup,
): JSONExpenseConflict[] {
  const participantNames = new Map(
    jsonData.participants.map((p) => [p.id, p.name]),
  )
  const existingParticipantNames = new Map(
    existingGroup.participants.map((p) => [p.id, p.name]),
  )
  const existingByBaseKey = new Map<string, ExistingGroup['expenses']>()
  const existingMergeKeys = new Set(
    existingGroup.expenses.map((expense) => createExpenseMergeKey(expense)),
  )

  for (const expense of existingGroup.expenses) {
    const baseKey = createExpenseBaseKey(expense)
    const list = existingByBaseKey.get(baseKey) ?? []
    list.push(expense)
    existingByBaseKey.set(baseKey, list)
  }

  const conflicts: JSONExpenseConflict[] = []
  jsonData.expenses.forEach((expense, index) => {
    const mergeKey = createExpenseMergeKey(expense)
    if (existingMergeKeys.has(mergeKey)) return

    const baseKey = createExpenseBaseKey(expense)
    const matches = existingByBaseKey.get(baseKey)
    if (!matches || matches.length === 0) return

    const existing = matches[0]
    const differences: Array<'category' | 'splitMode' | 'paidFor'> = []

    const existingCategoryKey = existing.category
      ? createCategoryKey(existing.category.grouping, existing.category.name)
      : ''
    const jsonCategoryKey = expense.category
      ? createCategoryKey(expense.category.grouping, expense.category.name)
      : ''
    if (existingCategoryKey !== jsonCategoryKey) differences.push('category')

    if (existing.splitMode !== mapSplitMode(expense.splitMode)) {
      differences.push('splitMode')
    }

    const existingPaidForKey = createPaidForKey(existing.paidFor)
    const jsonPaidForKey = createPaidForKey(expense.paidFor)
    if (existingPaidForKey !== jsonPaidForKey) differences.push('paidFor')

    conflicts.push({
      index,
      expenseDate: expense.expenseDate,
      title: expense.title,
      amount: expense.amount,
      paidById: expense.paidById,
      paidByName: participantNames.get(expense.paidById),
      jsonCategory: expense.category
        ? `${expense.category.grouping}/${expense.category.name}`
        : null,
      existingCategory: existing.category
        ? `${existing.category.grouping}/${existing.category.name}`
        : null,
      jsonSplitMode: expense.splitMode,
      existingSplitMode: existing.splitMode,
      jsonPaidFor: expense.paidFor.map(
        (pf) => participantNames.get(pf.participantId) ?? pf.participantId,
      ),
      existingPaidFor: existing.paidFor.map(
        (pf) =>
          existingParticipantNames.get(pf.participantId) ?? pf.participantId,
      ),
      differences,
    })
  })

  return conflicts
}

/**
 * Restore group from JSON export data
 */
export type JSONImportOptions = {
  conflictUpdates?: number[]
  sourceUrl?: string
}

export async function restoreGroupFromJSON(
  tx: Prisma.TransactionClient,
  jsonData: JSONImportData,
  mode: 'create' | 'update' | 'rollback',
  options: JSONImportOptions = {},
): Promise<void> {
  const importTime = new Date()

  if (mode === 'create') {
    // Create new group
    await tx.group.create({
      data: {
        id: jsonData.id,
        name: jsonData.name,
        currency: jsonData.currency,
        currencyCode: jsonData.currencyCode,
        participants: {
          create: jsonData.participants.map((p) => ({
            id: p.id,
            name: p.name,
          })),
        },
      },
    })

    // Mark the start of JSON import
    await tx.activity.create({
      data: {
        id: randomUUID(),
        groupId: jsonData.id,
        activityType: 'UPDATE_GROUP',
        time: importTime,
        data: buildImportMarkerData(
          mode,
          jsonData.expenses.length,
          options.sourceUrl,
        ),
      },
    })

    // Verify all participants exist and create a map
    const participantIds = new Set(jsonData.participants.map((p) => p.id))

    // Create all needed categories upfront
    const categoryMap = new Map<string, number>()
    const categoriesToCreate = new Set<string>()

    for (const expense of jsonData.expenses) {
      if (expense.category) {
        const categoryKey = createCategoryKey(
          expense.category.grouping,
          expense.category.name,
        )
        categoriesToCreate.add(categoryKey)
      }
    }

    for (const categoryKey of categoriesToCreate) {
      const { grouping, name } = parseCategoryKey(categoryKey)
      let category = await tx.category.findFirst({
        where: { grouping, name },
      })

      if (!category) {
        category = await tx.category.create({
          data: { grouping, name },
        })
      }

      categoryMap.set(categoryKey, category.id)
    }

    // Create expenses with their paidFor relations
    const expenseDataList: Array<{
      expenseId: string
      expense: any
      categoryId: number | null
    }> = []

    for (const expense of jsonData.expenses) {
      // Validate participant IDs
      if (!participantIds.has(expense.paidById)) {
        console.error(
          `[JSON Import ERROR] Participant not found for paidById ${expense.paidById} on expense "${expense.title}".`,
        )
        throw new Error(
          `Invalid paidById: ${expense.paidById} not found in participants for expense "${expense.title}". This expense was paid by a participant that doesn't exist in the imported participant list.`,
        )
      }
      for (const pf of expense.paidFor) {
        if (!participantIds.has(pf.participantId)) {
          console.error(
            `[JSON Import ERROR] Participant not found for participantId ${pf.participantId} on expense "${expense.title}".`,
          )
          throw new Error(
            `Invalid participantId: ${pf.participantId} not found in participants for expense "${expense.title}". This expense is shared with a participant that doesn't exist in the imported participant list.`,
          )
        }
      }

      let categoryId: number | null = null
      if (expense.category) {
        const categoryKey = createCategoryKey(
          expense.category.grouping,
          expense.category.name,
        )
        categoryId = categoryMap.get(categoryKey) ?? null
      }

      const expenseId = randomUUID()
      expenseDataList.push({ expenseId, expense, categoryId })
    }

    // Batch create expenses
    await tx.expense.createMany({
      data: expenseDataList.map(({ expenseId, expense, categoryId }) => ({
        id: expenseId,
        groupId: jsonData.id,
        expenseDate: new Date(expense.expenseDate),
        title: expense.title,
        categoryId: categoryId ?? 0,
        amount: expense.amount,
        originalAmount: expense.originalAmount,
        originalCurrency: expense.originalCurrency,
        conversionRate: expense.conversionRate
          ? parseFloat(expense.conversionRate)
          : null,
        paidById: expense.paidById,
        isReimbursement: expense.isReimbursement,
        splitMode: mapSplitMode(expense.splitMode),
        recurrenceRule: mapRecurrenceRule(expense.recurrenceRule),
      })),
    })

    // Batch create paidFor relations
    const allPaidFor: Array<{
      expenseId: string
      participantId: string
      shares: number
    }> = []
    for (const { expenseId, expense } of expenseDataList) {
      for (const pf of expense.paidFor) {
        allPaidFor.push({
          expenseId,
          participantId: pf.participantId,
          shares: pf.shares,
        })
      }
    }
    if (allPaidFor.length > 0) {
      await tx.expensePaidFor.createMany({
        data: allPaidFor,
      })
    }

    // Batch create activity logs
    await tx.activity.createMany({
      data: expenseDataList.map(({ expenseId, expense }) => ({
        id: randomUUID(),
        groupId: jsonData.id,
        activityType: 'CREATE_EXPENSE' as const,
        time: new Date(expense.expenseDate),
        expenseId: expenseId,
        data: JSON.stringify({
          title: expense.title,
          importDate: importTime.toISOString(),
        }),
      })),
    })
  } else if (mode === 'update') {
    // Update existing group - only add new expenses and participants
    const existingGroup = await tx.group.findUnique({
      where: { id: jsonData.id },
      include: {
        participants: true,
        expenses: {
          include: {
            paidFor: true,
            category: true,
          },
        },
      },
    })

    if (!existingGroup) {
      throw new Error('Group not found')
    }

    // Mark the start of JSON import
    await tx.activity.create({
      data: {
        id: randomUUID(),
        groupId: jsonData.id,
        activityType: 'UPDATE_GROUP',
        time: importTime,
        data: buildImportMarkerData(
          mode,
          jsonData.expenses.length,
          options.sourceUrl,
        ),
      },
    })

    // Update group metadata
    await tx.group.update({
      where: { id: jsonData.id },
      data: {
        name: jsonData.name,
        currency: jsonData.currency,
        currencyCode: jsonData.currencyCode,
      },
    })

    // Add new participants
    const existingParticipantIds = new Set(
      existingGroup.participants.map((p) => p.id),
    )
    const newParticipants = jsonData.participants.filter(
      (p) => !existingParticipantIds.has(p.id),
    )

    if (newParticipants.length > 0) {
      await tx.participant.createMany({
        data: newParticipants.map((participant) => ({
          id: participant.id,
          groupId: jsonData.id,
          name: participant.name,
        })),
      })
      newParticipants.forEach((p) => existingParticipantIds.add(p.id))
    }

    const conflictUpdateSet = new Set(options.conflictUpdates ?? [])

    const existingExpenseKeys = new Set(
      existingGroup.expenses.map((expense) =>
        createExpenseMergeKey(expense),
      ),
    )
    const existingExpensesByBaseKey = new Map<string, ExistingGroup['expenses']>()
    for (const expense of existingGroup.expenses) {
      const baseKey = createExpenseBaseKey(expense)
      const list = existingExpensesByBaseKey.get(baseKey) ?? []
      list.push(expense)
      existingExpensesByBaseKey.set(baseKey, list)
    }

    const newExpenses: Array<{
      expenseId: string
      expense: JSONImportData['expenses'][number]
      categoryId: number | null
    }> = []
    const expensesToUpdate: Array<{
      expenseId: string
      expense: JSONImportData['expenses'][number]
      categoryId: number | null
    }> = []
    const updatedExpenseIds = new Set<string>()

    // Pre-create all needed categories
    const categoryMap = new Map<string, number>()
    const categoriesToCheck = new Set<string>()

    jsonData.expenses.forEach((expense, index) => {
      const mergeKey = createExpenseMergeKey(expense)
      if (existingExpenseKeys.has(mergeKey)) return

      const baseKey = createExpenseBaseKey(expense)
      const existingMatches = existingExpensesByBaseKey.get(baseKey)
      if (existingMatches && existingMatches.length > 0) {
        if (!conflictUpdateSet.has(index)) return
      }

      if (expense.category) {
        const categoryKey = createCategoryKey(
          expense.category.grouping,
          expense.category.name,
        )
        categoriesToCheck.add(categoryKey)
      }
    })

    for (const categoryKey of categoriesToCheck) {
      const { grouping, name } = parseCategoryKey(categoryKey)
      let category = await tx.category.findFirst({
        where: { grouping, name },
      })

      if (!category) {
        category = await tx.category.create({
          data: { grouping, name },
        })
      }

      categoryMap.set(categoryKey, category.id)
    }

    // Filter and prepare new expenses
    jsonData.expenses.forEach((expense, index) => {
      const mergeKey = createExpenseMergeKey(expense)
      if (existingExpenseKeys.has(mergeKey)) return

      // Validate participant IDs exist
      if (!existingParticipantIds.has(expense.paidById)) {
        throw new Error(
          `Invalid paidById: ${expense.paidById} not found in participants for expense "${expense.title}"`,
        )
      }
      for (const pf of expense.paidFor) {
        if (!existingParticipantIds.has(pf.participantId)) {
          throw new Error(
            `Invalid participantId: ${pf.participantId} not found in participants for expense "${expense.title}"`,
          )
        }
      }

      const baseKey = createExpenseBaseKey(expense)
      const existingMatches = existingExpensesByBaseKey.get(baseKey)
      if (existingMatches && existingMatches.length > 0) {
        if (!conflictUpdateSet.has(index)) return

        const createdAtMatch = existingMatches.find(
          (match) =>
            normalizeExpenseDate(match.createdAt) ===
            normalizeExpenseDate(expense.createdAt),
        )
        const target =
          createdAtMatch ||
          existingMatches.find((match) => !updatedExpenseIds.has(match.id)) ||
          existingMatches[0]

        if (!target || updatedExpenseIds.has(target.id)) return

        let categoryId: number | null = null
        if (expense.category) {
          const categoryKey = createCategoryKey(
            expense.category.grouping,
            expense.category.name,
          )
          categoryId = categoryMap.get(categoryKey) ?? null
        }

        updatedExpenseIds.add(target.id)
        expensesToUpdate.push({ expenseId: target.id, expense, categoryId })
        return
      }

      let categoryId: number | null = null
      if (expense.category) {
        const categoryKey = createCategoryKey(
          expense.category.grouping,
          expense.category.name,
        )
        categoryId = categoryMap.get(categoryKey) ?? null
      }

      const expenseId = randomUUID()
      newExpenses.push({ expenseId, expense, categoryId })
    })

    if (newExpenses.length > 0) {
      // Batch create expenses
      await tx.expense.createMany({
        data: newExpenses.map(({ expenseId, expense, categoryId }) => ({
          id: expenseId,
          groupId: jsonData.id,
          expenseDate: new Date(expense.expenseDate),
          title: expense.title,
          categoryId: categoryId ?? 0,
          amount: expense.amount,
          originalAmount: expense.originalAmount,
          originalCurrency: expense.originalCurrency,
          conversionRate: expense.conversionRate
            ? parseFloat(expense.conversionRate)
            : null,
          paidById: expense.paidById,
          isReimbursement: expense.isReimbursement,
          splitMode: mapSplitMode(expense.splitMode),
          recurrenceRule: mapRecurrenceRule(expense.recurrenceRule),
        })),
      })

      // Batch create paidFor relations
      const allPaidFor: Array<{
        expenseId: string
        participantId: string
        shares: number
      }> = []
      for (const { expenseId, expense } of newExpenses) {
        for (const pf of expense.paidFor) {
          allPaidFor.push({
            expenseId,
            participantId: pf.participantId,
            shares: pf.shares,
          })
        }
      }
      if (allPaidFor.length > 0) {
        await tx.expensePaidFor.createMany({
          data: allPaidFor,
        })
      }

      // Batch create activity logs
      await tx.activity.createMany({
        data: newExpenses.map(({ expenseId, expense }) => ({
          id: randomUUID(),
          groupId: jsonData.id,
          activityType: 'CREATE_EXPENSE' as const,
          time: new Date(expense.expenseDate),
          expenseId: expenseId,
          data: JSON.stringify({
            title: expense.title,
            importDate: importTime.toISOString(),
          }),
        })),
      })
    }

    if (expensesToUpdate.length > 0) {
      for (const { expenseId, expense, categoryId } of expensesToUpdate) {
        await tx.expense.update({
          where: { id: expenseId },
          data: {
            expenseDate: new Date(expense.expenseDate),
            title: expense.title,
            categoryId: categoryId ?? 0,
            amount: expense.amount,
            originalAmount: expense.originalAmount,
            originalCurrency: expense.originalCurrency,
            conversionRate: expense.conversionRate
              ? parseFloat(expense.conversionRate)
              : null,
            paidById: expense.paidById,
            isReimbursement: expense.isReimbursement,
            splitMode: mapSplitMode(expense.splitMode),
            recurrenceRule: mapRecurrenceRule(expense.recurrenceRule),
          },
        })

        await tx.expensePaidFor.deleteMany({
          where: { expenseId },
        })

        if (expense.paidFor.length > 0) {
          await tx.expensePaidFor.createMany({
            data: expense.paidFor.map((pf) => ({
              expenseId,
              participantId: pf.participantId,
              shares: pf.shares,
            })),
          })
        }
      }

      await tx.activity.createMany({
        data: expensesToUpdate.map(({ expenseId, expense }) => ({
          id: randomUUID(),
          groupId: jsonData.id,
          activityType: 'UPDATE_EXPENSE' as const,
          time: importTime,
          expenseId: expenseId,
          data: JSON.stringify({
            title: expense.title,
            importDate: importTime.toISOString(),
          }),
        })),
      })
    }
  } else if (mode === 'rollback') {
    // Delete all existing expenses and participants, then recreate from JSON
    await tx.expensePaidFor.deleteMany({
      where: {
        expense: {
          groupId: jsonData.id,
        },
      },
    })

    await tx.expense.deleteMany({
      where: { groupId: jsonData.id },
    })

    await tx.participant.deleteMany({
      where: { groupId: jsonData.id },
    })

    await tx.activity.deleteMany({
      where: { groupId: jsonData.id },
    })

    // Update group metadata
    await tx.group.update({
      where: { id: jsonData.id },
      data: {
        name: jsonData.name,
        currency: jsonData.currency,
        currencyCode: jsonData.currencyCode,
      },
    })

    // Mark the start of JSON import (rollback)
    await tx.activity.create({
      data: {
        id: randomUUID(),
        groupId: jsonData.id,
        activityType: 'UPDATE_GROUP',
        time: importTime,
        data: buildImportMarkerData(
          mode,
          jsonData.expenses.length,
          options.sourceUrl,
        ),
      },
    })

    // Recreate participants
    const participantIds = new Set<string>()
    for (const participant of jsonData.participants) {
      await tx.participant.create({
        data: {
          id: participant.id,
          groupId: jsonData.id,
          name: participant.name,
        },
      })
      participantIds.add(participant.id)
    }

    // Recreate expenses
    for (const expense of jsonData.expenses) {
      // Validate participant IDs
      if (!participantIds.has(expense.paidById)) {
        throw new Error(
          `Invalid paidById: ${expense.paidById} not found in participants for expense "${expense.title}"`,
        )
      }
      for (const pf of expense.paidFor) {
        if (!participantIds.has(pf.participantId)) {
          throw new Error(
            `Invalid participantId: ${pf.participantId} not found in participants for expense "${expense.title}"`,
          )
        }
      }

      let categoryId: number | null = null

      if (expense.category) {
        let category = await tx.category.findFirst({
          where: {
            grouping: expense.category.grouping,
            name: expense.category.name,
          },
        })

        if (!category) {
          category = await tx.category.create({
            data: {
              grouping: expense.category.grouping,
              name: expense.category.name,
            },
          })
        }

        categoryId = category.id
      }

      const expenseId = randomUUID()
      await tx.expense.create({
        data: {
          id: expenseId,
          groupId: jsonData.id,
          expenseDate: new Date(expense.expenseDate),
          title: expense.title,
          categoryId: categoryId ?? 0,
          amount: expense.amount,
          originalAmount: expense.originalAmount,
          originalCurrency: expense.originalCurrency,
          conversionRate: expense.conversionRate
            ? parseFloat(expense.conversionRate)
            : null,
          paidById: expense.paidById,
          isReimbursement: expense.isReimbursement,
          splitMode: mapSplitMode(expense.splitMode),
          recurrenceRule: mapRecurrenceRule(expense.recurrenceRule),
          paidFor: {
            create: expense.paidFor.map((pf) => ({
              participantId: pf.participantId,
              shares: pf.shares,
            })),
          },
        },
      })

      // Create activity log for imported expense, embedding import date
      await tx.activity.create({
        data: {
          id: randomUUID(),
          groupId: jsonData.id,
          activityType: 'CREATE_EXPENSE',
          time: new Date(expense.expenseDate),
          expenseId: expenseId,
          data: JSON.stringify({
            title: expense.title,
            importDate: importTime.toISOString(),
          }),
        },
      })
    }
  }
}
