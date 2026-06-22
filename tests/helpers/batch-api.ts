import type { AppRouter } from '@/trpc/routers/_app'
import type { Page } from '@playwright/test'
import { RecurrenceRule, SplitMode } from '@prisma/client'
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import superjson from 'superjson'

interface ExpenseFormValues {
  expenseDate: Date
  title: string
  category: number
  amount: number
  paidBy: string
  paidFor: Array<{ participant: string; shares: number }>
  splitMode: SplitMode
  isReimbursement: boolean
  recurrenceRule: RecurrenceRule | 'NONE'
  saveDefaultSplittingOptions: boolean
  documents?: Array<{ id: string; url: string; width: number; height: number }>
  notes?: string
}

interface GroupFormValues {
  name: string
  information?: string
  currency: string
  currencyCode: string
  participants: Array<{ id?: string; name: string }>
}

function createTrpcClient(page: Page) {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${new URL(page.url()).origin}/api/trpc`,
        async headers() {
          return {
            cookie: await page.evaluate(() => document.cookie),
          }
        },
        transformer: superjson,
      }),
    ],
  })
}

export async function createGroupViaAPI(
  page: Page,
  groupName: string,
  participants: string[],
  currency = 'USD',
  persistOptions: {
    suppressActiveUserModal: boolean
    addGroupToRecent: boolean
  } = { suppressActiveUserModal: true, addGroupToRecent: true },
): Promise<string> {
  const trpc = createTrpcClient(page)

  const groupFormValues: GroupFormValues = {
    name: groupName,
    currency,
    currencyCode: currency,
    participants: participants.map((name) => ({ name })),
  }

  const result = await trpc.groups.create.mutate({ groupFormValues })

  if (persistOptions.suppressActiveUserModal) {
    await page.evaluate((gId) => {
      localStorage.setItem(`${gId}-activeUser`, 'None')
    }, result.groupId)
  }
  if (persistOptions.addGroupToRecent) {
    await page.evaluate(
      (group) => {
        const existing = JSON.parse(
          localStorage.getItem('recentGroups') ?? '[]',
        ) as { id: string; name: string }[]
        if (existing.some((g) => g.id === group.id)) return
        localStorage.setItem(
          'recentGroups',
          JSON.stringify([group, ...existing]),
        )
      },
      { id: result.groupId, name: groupName },
    )
  }

  return result.groupId
}

export async function createExpensesViaAPI(
  page: Page,
  groupId: string,
  expenses:
    | Array<{
        title: string
        amount: number // in cents
        payerName: string
        isReimbursement?: boolean
        category?: number
        splitMode?: SplitMode
        expenseDate?: Date
        notes?: string
        paidFor?: Array<{ participant: string; shares: number }>
        excludeParticipants?: string[] // Participant names to exclude from the split
        recurrenceRule?: RecurrenceRule | 'NONE'
      }>
    | number, // If number, creates that many expenses with default values
  payerNames?: string[], // Only used when first param is a number
): Promise<string[]> {
  const trpc = createTrpcClient(page)

  const groupData = await trpc.groups.get.query({ groupId })
  const participants = groupData.group?.participants

  if (!participants) {
    throw new Error('Group participants not found')
  }

  // Handle legacy signature: createExpensesViaAPI(page, groupId, count, payerNames)
  let expensesToCreate: Array<{
    title: string
    amount: number
    payerName: string
    isReimbursement?: boolean
    category?: number
    splitMode?: SplitMode
    expenseDate?: Date
    notes?: string
    paidFor?: Array<{ participant: string; shares: number }>
    excludeParticipants?: string[]
    recurrenceRule?: RecurrenceRule | 'NONE'
  }>

  if (typeof expenses === 'number') {
    // Legacy mode: generate expenses
    const count = expenses
    const payers = groupData.group?.participants.map((p) => p.name) ?? [
      'Alice',
      'Bob',
    ]
    expensesToCreate = []
    for (let i = 1; i <= count; i++) {
      const payerName = payers[i % payers.length]!
      expensesToCreate.push({
        title: `Expense ${i}`,
        amount: 1000 + i * 100,
        payerName,
      })
    }
  } else {
    expensesToCreate = expenses
  }

  const expenseIds: string[] = []

  for (const expense of expensesToCreate) {
    const payer = participants.find((p) => p.name === expense.payerName)
    if (!payer) {
      throw new Error(`Participant ${expense.payerName} not found in group`)
    }

    // Handle excludeParticipants if provided
    let paidFor = expense.paidFor
    if (!paidFor && expense.excludeParticipants) {
      // Exclude specified participants from the split
      paidFor = participants
        .filter((p) => !expense.excludeParticipants!.includes(p.name))
        .map((p) => ({
          participant: p.id,
          shares: 1,
        }))
    } else if (!paidFor) {
      // Include all participants
      paidFor = participants.map((p) => ({
        participant: p.id,
        shares: 1,
      }))
    }

    const expenseFormValues: ExpenseFormValues = {
      expenseDate: expense.expenseDate || new Date(),
      title: expense.title,
      category: expense.category ?? 0,
      amount: expense.amount,
      paidBy: payer.id,
      paidFor,
      splitMode: expense.splitMode || SplitMode.EVENLY,
      isReimbursement: expense.isReimbursement || false,
      recurrenceRule: expense.recurrenceRule || 'NONE',
      saveDefaultSplittingOptions: true,
      notes: expense.notes,
    }

    const result = await trpc.groups.expenses.create.mutate({
      groupId,
      expenseFormValues,
      participantId: payer.id,
    })

    expenseIds.push(result.expenseId)
  }

  return expenseIds
}

export async function createExpenseViaAPI(
  page: Page,
  groupId: string,
  expense: {
    title: string
    amount: number // in cents
    payerName: string
    isReimbursement?: boolean
    category?: number
    splitMode?: SplitMode
    expenseDate?: Date
    notes?: string
    paidFor?: Array<{ participant: string; shares: number }>
    excludeParticipants?: string[] // Participant names to exclude from the split
    recurrenceRule?: RecurrenceRule | 'NONE'
  },
): Promise<string> {
  const expenseIds = await createExpensesViaAPI(page, groupId, [expense])
  return expenseIds[0]!
}
