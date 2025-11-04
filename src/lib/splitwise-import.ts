import { prisma } from '@/lib/prisma'
import { ExpenseFormValues } from '@/lib/schemas'
import { SplitMode } from '@prisma/client'

// Splitwise CSV import functionality

export interface SplitwiseExpenseRow {
  date: string
  description: string
  category: string
  cost: number
  currency: string
  [userName: string]: string | number // Dynamic user columns
}

export interface ParsedSplitwiseExpense {
  expenseDate: Date
  title: string
  category: number
  amount: number
  originalAmount?: number
  originalCurrency?: string
  conversionRate?: number
  paidBy: string
  paidFor: Array<{
    participant: string
    shares: number
  }>
  splitMode: SplitMode
  isReimbursement: boolean
  notes?: string
}

/**
 * Parses Splitwise CSV content and converts it to Knots expense format
 * @param csvContent - The CSV content from Splitwise export
 * @param groupId - The target group ID for the expenses
 * @returns Array of parsed expenses ready for creation
 */
export async function parseSplitwiseCSV(
  csvContent: string,
  groupId: string,
): Promise<ExpenseFormValues[]> {
  // Parse CSV content
  const lines = csvContent.trim().split('\n')
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row')
  }

  const headers = parseCSVLine(lines[0]).map((header) =>
    header.trim().replace(/\r/g, ''),
  )
  const dataRows = lines.slice(1).map((line) => parseCSVLine(line))

  // Get group participants for user matching
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { participants: true },
  })

  if (!group) {
    throw new Error('Group not found')
  }

  // Get categories for mapping
  const categories = await prisma.category.findMany()
  const categoryMap = new Map<string, number>()
  for (const cat of categories) {
    categoryMap.set(cat.name.toLowerCase(), cat.id)
  }

  // Identify user columns (all columns except the standard ones)
  const standardColumns = [
    'Date',
    'Description',
    'Category',
    'Cost',
    'Currency',
  ]
  const userColumns = headers.filter(
    (header) => !standardColumns.includes(header),
  )

  if (userColumns.length === 0) {
    throw new Error('No user columns found in CSV')
  }

  const expenses: ExpenseFormValues[] = []

  for (const row of dataRows) {
    // Skip total row (usually the last row with totals)
    if (isTotalRow(row, headers)) {
      continue
    }

    try {
      const expense = await parseExpenseRow(
        row,
        headers,
        userColumns,
        group.participants,
        categoryMap,
      )
      expenses.push(expense)
    } catch (error) {
      console.warn(`Failed to parse expense row: ${error}`)
      // Continue with other rows
    }
  }

  return expenses
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/\r/g, '')) // Remove carriage returns
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim().replace(/\r/g, '')) // Remove carriage returns
  return result
}

function isTotalRow(row: string[], headers: string[]): boolean {
  // Check if this looks like a total row (usually has empty description or "Total")
  const descriptionIndex = headers.indexOf('Description')
  if (descriptionIndex >= 0) {
    const description = (row[descriptionIndex] || '').trim().toLowerCase()
    return (
      description === '' ||
      description.includes('total') ||
      description.includes('balance')
    )
  }

  // Also check if the row has empty cost (another indicator of total row)
  const costIndex = headers.indexOf('Cost')
  if (costIndex >= 0) {
    const cost = (row[costIndex] || '').trim()
    if (cost === '' || cost === ' ') {
      return true
    }
  }

  return false
}

async function parseExpenseRow(
  row: string[],
  headers: string[],
  userColumns: string[],
  participants: Array<{ id: string; name: string }>,
  categoryMap: Map<string, number>,
): Promise<ExpenseFormValues> {
  // Extract basic expense data
  const dateIndex = headers.indexOf('Date')
  const descriptionIndex = headers.indexOf('Description')
  const categoryIndex = headers.indexOf('Category')
  const costIndex = headers.indexOf('Cost')
  const currencyIndex = headers.indexOf('Currency')

  if (dateIndex === -1 || descriptionIndex === -1 || costIndex === -1) {
    throw new Error('Required columns (Date, Description, Cost) not found')
  }

  const dateStr = row[dateIndex]
  const description = row[descriptionIndex]
  const categoryName = categoryIndex >= 0 ? row[categoryIndex] : ''
  const costStr = row[costIndex]
  const currency = currencyIndex >= 0 ? row[currencyIndex] : 'USD'

  // Parse date
  const expenseDate = new Date(dateStr)
  if (isNaN(expenseDate.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`)
  }

  // Parse cost (Splitwise exports in decimal format, convert to cents)
  const cost = parseFloat(costStr)
  if (isNaN(cost)) {
    throw new Error(`Invalid cost: ${costStr}`)
  }
  const costInCents = Math.round(cost * 100) // Convert to cents

  // Find category
  const categoryId = categoryName
    ? categoryMap.get(categoryName.toLowerCase()) || 0
    : 0

  // Parse user amounts
  const userAmounts = new Map<string, number>()
  let paidByUser = ''
  let maxAmount = -Infinity

  for (const userColumn of userColumns) {
    const userIndex = headers.indexOf(userColumn)
    if (userIndex >= 0) {
      const amountStr = row[userIndex]
      const amount = parseFloat(amountStr) || 0
      const amountInCents = Math.round(amount * 100) // Convert to cents
      userAmounts.set(userColumn, amountInCents)

      // In Splitwise: positive amount = person's net balance (how much they're owed)
      // The person who actually paid is the one with the highest positive amount
      // This represents who paid more than they owe in this expense
      if (amountInCents > maxAmount) {
        maxAmount = amountInCents
        paidByUser = userColumn
      }
    }
  }

  if (!paidByUser) {
    throw new Error('Could not determine who paid for this expense')
  }

  // Match users to participants
  const paidByParticipant = findMatchingParticipant(paidByUser, participants)
  if (!paidByParticipant) {
    throw new Error(`Could not find participant matching "${paidByUser}"`)
  }

  // Create paidFor entries
  const paidFor: Array<{ participant: string; shares: number }> = []

  userAmounts.forEach((amount, userName) => {
    if (amount !== 0) {
      // Only include users who have a share
      const participant = findMatchingParticipant(userName, participants)
      if (participant) {
        // In Splitwise: amounts represent net balances
        // For BY_AMOUNT split mode, shares should represent how much each person owes
        // If amount is positive, person paid more than they owe, so their share is (total - amount)
        // If amount is negative, person owes more than they paid, so their share is |amount|
        const totalExpense = costInCents
        const userShare = amount > 0 ? totalExpense - amount : Math.abs(amount)

        paidFor.push({
          participant: participant.id,
          shares: userShare,
        })
      }
    }
  })

  if (paidFor.length === 0) {
    throw new Error('No valid participants found for this expense')
  }

  // Determine split mode based on the data
  // If all shares are equal, use EVENLY; otherwise use BY_AMOUNT
  const shares = paidFor.map((p) => p.shares)
  const allSharesEqual = shares.every((share) => share === shares[0])
  const splitMode = allSharesEqual ? 'EVENLY' : 'BY_AMOUNT'

  // Check if this is a reimbursement (Payment category)
  const isReimbursement = categoryName?.toLowerCase() === 'payment'

  return {
    expenseDate,
    title: description,
    category: categoryId,
    amount: costInCents,
    paidBy: paidByParticipant.id,
    paidFor,
    splitMode: splitMode as SplitMode,
    saveDefaultSplittingOptions: false,
    isReimbursement,
    documents: [],
    notes: `Imported from Splitwise`,
    recurrenceRule: 'NONE' as const,
  }
}

function findMatchingParticipant(
  userName: string,
  participants: Array<{ id: string; name: string }>,
): { id: string; name: string } | null {
  // Try exact match first
  let participant = participants.find((p) => p.name === userName)
  if (participant) return participant

  // Try case-insensitive match
  participant = participants.find(
    (p) => p.name.toLowerCase() === userName.toLowerCase(),
  )
  if (participant) return participant

  // Try partial match (in case of slight name differences)
  const normalizedUserName = userName.toLowerCase().trim()
  participant = participants.find(
    (p) =>
      p.name.toLowerCase().trim() === normalizedUserName ||
      p.name.toLowerCase().includes(normalizedUserName) ||
      normalizedUserName.includes(p.name.toLowerCase()),
  )

  return participant || null
}
