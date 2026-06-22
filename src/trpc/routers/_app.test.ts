import { prisma } from '@/lib/prisma'
import type { ExpenseFormValues, GroupFormValues } from '@/lib/schemas'
import {
  checkDatabaseAvailability,
  testRequiresDatabase,
} from '@/test/database'
import { appRouter } from '@/trpc/routers/_app'
import { RecurrenceRule, SplitMode } from '@prisma/client'

const caller = appRouter.createCaller({})
const createdGroupIds = new Set<string>()

const groupFormValues = (name: string): GroupFormValues => ({
  name,
  information: 'Router test group',
  currency: '$',
  currencyCode: 'USD',
  participants: [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' }],
})

const expenseFormValues = (
  participants: Array<{ id: string; name: string }>,
  overrides: Partial<ExpenseFormValues> = {},
): ExpenseFormValues => ({
  expenseDate: new Date(Date.UTC(2025, 5, 1)),
  title: 'Dinner',
  category: 0,
  amount: 9000,
  originalAmount: undefined,
  originalCurrency: 'USD',
  conversionRate: undefined,
  paidBy: participants[0]!.id,
  paidFor: participants.map(({ id }) => ({ participant: id, shares: 1 })),
  splitMode: SplitMode.EVENLY,
  saveDefaultSplittingOptions: false,
  isReimbursement: false,
  documents: [],
  notes: '',
  recurrenceRule: RecurrenceRule.NONE,
  ...overrides,
})

async function createGroup(name: string) {
  const result = await caller.groups.create({
    groupFormValues: groupFormValues(name),
  })
  createdGroupIds.add(result.groupId)
  return result.groupId
}

beforeAll(async () => {
  await checkDatabaseAvailability()
})

afterEach(async () => {
  if (!testRequiresDatabase()) return
  if (createdGroupIds.size === 0) return
  await prisma.group.deleteMany({
    where: { id: { in: Array.from(createdGroupIds) } },
  })
  createdGroupIds.clear()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('appRouter groups contract', () => {
  it('creates, reads, lists, and updates a group', async () => {
    if (!testRequiresDatabase()) return

    const groupId = await createGroup('Router group')

    await expect(caller.groups.get({ groupId })).resolves.toMatchObject({
      group: {
        id: groupId,
        name: 'Router group',
        participants: expect.arrayContaining([
          expect.objectContaining({ name: 'Alice' }),
          expect.objectContaining({ name: 'Bob' }),
        ]),
      },
    })

    await expect(
      caller.groups.list({ groupIds: [groupId, 'missing'] }),
    ).resolves.toEqual({
      groups: [
        expect.objectContaining({
          id: groupId,
          name: 'Router group',
          createdAt: expect.any(String),
        }),
      ],
    })

    const { group } = await caller.groups.getDetails({ groupId })
    const [alice, bob] = group.participants
    await caller.groups.update({
      groupId,
      groupFormValues: {
        name: 'Renamed router group',
        information: 'Updated',
        currency: 'EUR',
        currencyCode: 'EUR',
        participants: [
          { id: alice!.id, name: 'Alice' },
          { id: bob!.id, name: 'Bobby' },
          { name: 'Dana' },
        ],
      },
      participantId: alice!.id,
    })

    await expect(caller.groups.getDetails({ groupId })).resolves.toEqual(
      expect.objectContaining({
        group: expect.objectContaining({
          name: 'Renamed router group',
          currencyCode: 'EUR',
          participants: expect.arrayContaining([
            expect.objectContaining({ name: 'Alice' }),
            expect.objectContaining({ name: 'Bobby' }),
            expect.objectContaining({ name: 'Dana' }),
          ]),
        }),
        participantsWithExpenses: [],
      }),
    )
  })

  it('returns NOT_FOUND for missing group details', async () => {
    if (!testRequiresDatabase()) return

    await expect(
      caller.groups.getDetails({ groupId: 'missing-group' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('appRouter expenses contract', () => {
  it('creates, lists, reads, updates, deletes, and reports activities', async () => {
    if (!testRequiresDatabase()) return

    const groupId = await createGroup('Expense router group')
    const { group } = await caller.groups.get({ groupId })
    const participants = group!.participants
    const [alice, bob, charlie] = participants

    const created = await caller.groups.expenses.create({
      groupId,
      participantId: alice!.id,
      expenseFormValues: expenseFormValues(participants, {
        title: 'Pizza',
        paidBy: alice!.id,
      }),
    })

    await expect(
      caller.groups.expenses.list({ groupId, limit: 1 }),
    ).resolves.toEqual({
      expenses: [
        expect.objectContaining({
          id: created.expenseId,
          title: 'Pizza',
          amount: 9000,
          createdAt: expect.any(Date),
          expenseDate: expect.any(Date),
        }),
      ],
      hasMore: false,
      nextCursor: 1,
    })

    await expect(
      caller.groups.expenses.get({
        groupId,
        expenseId: created.expenseId,
      }),
    ).resolves.toMatchObject({
      expense: {
        id: created.expenseId,
        title: 'Pizza',
        paidById: alice!.id,
      },
    })

    await caller.groups.expenses.update({
      groupId,
      expenseId: created.expenseId,
      participantId: bob!.id,
      expenseFormValues: expenseFormValues(participants, {
        title: 'Pizza and drinks',
        amount: 12000,
        paidBy: bob!.id,
        paidFor: [
          { participant: bob!.id, shares: 4000 },
          { participant: charlie!.id, shares: 8000 },
        ],
        splitMode: SplitMode.BY_AMOUNT,
      }),
    })

    await expect(
      caller.groups.expenses.get({
        groupId,
        expenseId: created.expenseId,
      }),
    ).resolves.toMatchObject({
      expense: {
        title: 'Pizza and drinks',
        amount: 12000,
        paidById: bob!.id,
        splitMode: SplitMode.BY_AMOUNT,
      },
    })

    await expect(caller.groups.stats.get({ groupId })).resolves.toEqual({
      totalGroupSpendings: 12000,
      totalParticipantSpendings: undefined,
      totalParticipantShare: undefined,
    })

    await expect(
      caller.groups.balances.list({ groupId }),
    ).resolves.toMatchObject({
      balances: expect.any(Object),
      reimbursements: expect.any(Array),
    })

    await caller.groups.expenses.delete({
      groupId,
      expenseId: created.expenseId,
      participantId: charlie!.id,
    })

    await expect(
      caller.groups.expenses.get({
        groupId,
        expenseId: created.expenseId,
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })

    await expect(
      caller.groups.activities.list({ groupId, limit: 10 }),
    ).resolves.toMatchObject({
      activities: [
        expect.objectContaining({ activityType: 'DELETE_EXPENSE' }),
        expect.objectContaining({ activityType: 'UPDATE_EXPENSE' }),
        expect.objectContaining({ activityType: 'CREATE_EXPENSE' }),
      ],
      hasMore: false,
      nextCursor: 10,
    })
  })

  it('validates create expense input at the router boundary', async () => {
    if (!testRequiresDatabase()) return

    const groupId = await createGroup('Validation router group')
    const { group } = await caller.groups.get({ groupId })

    await expect(
      caller.groups.expenses.create({
        groupId,
        expenseFormValues: expenseFormValues(group!.participants, {
          title: '',
        }),
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })
})
