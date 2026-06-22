import { prisma } from '@/lib/prisma'
import type { ExpenseFormValues, GroupFormValues } from '@/lib/schemas'
import {
  checkDatabaseAvailability,
  testRequiresDatabase,
} from '@/test/database'
import { ActivityType, RecurrenceRule, SplitMode } from '@prisma/client'
import {
  createExpense,
  createGroup,
  createPayloadForNewRecurringExpenseLink,
  createRecurringExpenses,
  deleteExpense,
  getActivities,
  getExpense,
  getGroupExpenses,
  getGroupExpensesParticipants,
  getGroups,
  randomId,
  updateExpense,
  updateGroup,
} from './api'

const createdGroupIds = new Set<string>()

const baseGroupValues = (
  name = `Test Group ${randomId(6)}`,
): GroupFormValues => ({
  name,
  information: 'Initial information',
  currency: '$',
  currencyCode: 'USD',
  participants: [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' }],
})

const expenseValues = (
  participants: Array<{ id: string; name: string }>,
  overrides: Partial<ExpenseFormValues> = {},
): ExpenseFormValues => ({
  expenseDate: new Date(Date.UTC(2025, 0, 10)),
  title: 'Dinner',
  category: 0,
  amount: 3000,
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

async function createTrackedGroup(values = baseGroupValues()) {
  const group = await createGroup(values)
  createdGroupIds.add(group.id)
  return group
}

async function cleanupCreatedGroups() {
  if (createdGroupIds.size === 0) return
  await prisma.group.deleteMany({
    where: { id: { in: Array.from(createdGroupIds) } },
  })
  createdGroupIds.clear()
}

beforeAll(async () => {
  await checkDatabaseAvailability()
})

afterEach(async () => {
  if (!testRequiresDatabase()) return
  await cleanupCreatedGroups()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('group persistence', () => {
  it('creates a group with participants and lists groups in the requested set', async () => {
    if (!testRequiresDatabase()) return

    const group = await createTrackedGroup(baseGroupValues('Road trip'))

    expect(group.name).toBe('Road trip')
    expect(group.participants.map((participant) => participant.name)).toEqual([
      'Alice',
      'Bob',
      'Charlie',
    ])

    const groups = await getGroups([group.id, 'missing-group'])
    expect(groups).toEqual([
      expect.objectContaining({
        id: group.id,
        name: 'Road trip',
        createdAt: expect.any(String),
        _count: { participants: 3 },
      }),
    ])
  })

  it('updates group metadata, adds participants, renames participants, and removes unused participants', async () => {
    if (!testRequiresDatabase()) return

    const group = await createTrackedGroup()
    const [alice, bob] = group.participants

    await updateGroup(
      group.id,
      {
        name: 'Updated group',
        information: 'Updated information',
        currency: 'EUR',
        currencyCode: 'EUR',
        participants: [
          { id: alice!.id, name: 'Alicia' },
          { id: bob!.id, name: 'Bob' },
          { name: 'Dana' },
        ],
      },
      alice!.id,
    )

    const updatedGroup = await prisma.group.findUniqueOrThrow({
      where: { id: group.id },
      include: { participants: { orderBy: { name: 'asc' } } },
    })
    expect(updatedGroup).toMatchObject({
      name: 'Updated group',
      information: 'Updated information',
      currency: 'EUR',
      currencyCode: 'EUR',
    })
    expect(
      updatedGroup.participants.map((participant) => participant.name),
    ).toEqual(['Alicia', 'Bob', 'Dana'])

    await expect(getActivities(group.id)).resolves.toEqual([
      expect.objectContaining({
        activityType: ActivityType.UPDATE_GROUP,
        participantId: alice!.id,
      }),
    ])
  })
})

describe('expense persistence', () => {
  it('creates, retrieves, updates, and deletes an expense with activity entries', async () => {
    if (!testRequiresDatabase()) return

    const group = await createTrackedGroup()
    const [alice, bob, charlie] = group.participants

    const created = await createExpense(
      expenseValues(group.participants, {
        title: 'Lunch',
        paidBy: alice!.id,
        paidFor: [
          { participant: alice!.id, shares: 1 },
          { participant: bob!.id, shares: 2 },
        ],
        splitMode: SplitMode.BY_SHARES,
        notes: 'Window table',
      }),
      group.id,
      alice!.id,
    )

    const fetched = await getExpense(group.id, created.id)
    expect(fetched).toMatchObject({
      id: created.id,
      title: 'Lunch',
      amount: 3000,
      paidById: alice!.id,
      splitMode: SplitMode.BY_SHARES,
      notes: 'Window table',
    })
    expect(fetched!.paidFor).toHaveLength(2)

    await updateExpense(
      group.id,
      created.id,
      expenseValues(group.participants, {
        title: 'Updated lunch',
        amount: 4200,
        paidBy: bob!.id,
        paidFor: [
          { participant: bob!.id, shares: 2100 },
          { participant: charlie!.id, shares: 2100 },
        ],
        splitMode: SplitMode.BY_AMOUNT,
        isReimbursement: true,
      }),
      bob!.id,
    )

    const updated = await getExpense(group.id, created.id)
    expect(updated).toMatchObject({
      title: 'Updated lunch',
      amount: 4200,
      paidById: bob!.id,
      splitMode: SplitMode.BY_AMOUNT,
      isReimbursement: true,
    })
    expect(
      updated!.paidFor.map((paidFor) => paidFor.participantId).sort(),
    ).toEqual([bob!.id, charlie!.id].sort())

    await deleteExpense(group.id, created.id, charlie!.id)
    await expect(getExpense(group.id, created.id)).resolves.toBeNull()

    const activities = await getActivities(group.id)
    expect(activities.map((activity) => activity.activityType)).toEqual([
      ActivityType.DELETE_EXPENSE,
      ActivityType.UPDATE_EXPENSE,
      ActivityType.CREATE_EXPENSE,
    ])
    expect(activities).toEqual([
      expect.objectContaining({
        participantId: charlie!.id,
        expenseId: created.id,
        data: 'Updated lunch',
      }),
      expect.objectContaining({
        participantId: bob!.id,
        expenseId: created.id,
        data: 'Updated lunch',
      }),
      expect.objectContaining({
        participantId: alice!.id,
        expenseId: created.id,
        data: 'Lunch',
      }),
    ])
  })

  it('rejects expenses with participants outside the group', async () => {
    if (!testRequiresDatabase()) return

    const group = await createTrackedGroup()

    await expect(
      createExpense(
        expenseValues(group.participants, {
          paidBy: 'not-in-this-group',
        }),
        group.id,
      ),
    ).rejects.toThrow('Invalid participant ID: not-in-this-group')
  })

  it('filters, orders, and paginates group expenses', async () => {
    if (!testRequiresDatabase()) return

    const group = await createTrackedGroup()
    const [alice] = group.participants

    await createExpense(
      expenseValues(group.participants, {
        title: 'Older pizza',
        amount: 1000,
        expenseDate: new Date(Date.UTC(2025, 0, 1)),
      }),
      group.id,
      alice!.id,
    )
    await createExpense(
      expenseValues(group.participants, {
        title: 'Newer pizza',
        amount: 2000,
        expenseDate: new Date(Date.UTC(2025, 0, 2)),
      }),
      group.id,
      alice!.id,
    )
    await createExpense(
      expenseValues(group.participants, {
        title: 'Museum tickets',
        amount: 3000,
        expenseDate: new Date(Date.UTC(2025, 0, 3)),
      }),
      group.id,
      alice!.id,
    )

    await expect(
      getGroupExpenses(group.id, { filter: 'pizza' }),
    ).resolves.toEqual([
      expect.objectContaining({ title: 'Newer pizza' }),
      expect.objectContaining({ title: 'Older pizza' }),
    ])

    await expect(
      getGroupExpenses(group.id, { offset: 1, length: 1 }),
    ).resolves.toEqual([expect.objectContaining({ title: 'Newer pizza' })])
  })

  it('returns participant ids that are used by expenses', async () => {
    if (!testRequiresDatabase()) return

    const group = await createTrackedGroup()
    const [alice, bob] = group.participants

    await createExpense(
      expenseValues(group.participants, {
        paidBy: alice!.id,
        paidFor: [{ participant: bob!.id, shares: 1 }],
      }),
      group.id,
    )

    await expect(getGroupExpensesParticipants(group.id)).resolves.toEqual([
      alice!.id,
      bob!.id,
    ])
  })
})

describe('recurring expenses', () => {
  it('builds the next recurring expense payload from the shared date logic', () => {
    const payload = createPayloadForNewRecurringExpenseLink(
      RecurrenceRule.MONTHLY,
      new Date(Date.UTC(2024, 0, 31)),
      'group-1',
    )

    expect(payload).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        groupId: 'group-1',
        nextExpenseDate: new Date(Date.UTC(2024, 1, 29)),
      }),
    )
  })

  it('creates due recurring instances and marks each processed link', async () => {
    if (!testRequiresDatabase()) return

    const group = await createTrackedGroup()
    const [alice] = group.participants
    const original = await createExpense(
      expenseValues(group.participants, {
        title: 'Monthly rent',
        amount: 120000,
        paidBy: alice!.id,
        expenseDate: new Date(Date.UTC(2025, 0, 31)),
        recurrenceRule: RecurrenceRule.MONTHLY,
      }),
      group.id,
      alice!.id,
    )

    await createRecurringExpenses()

    const expenses = await prisma.expense.findMany({
      where: { groupId: group.id },
      include: { paidFor: true, recurringExpenseLink: true },
      orderBy: { expenseDate: 'asc' },
    })
    expect(expenses.length).toBeGreaterThan(1)
    expect(expenses[0]).toMatchObject({
      id: original.id,
      title: 'Monthly rent',
      amount: 120000,
      recurrenceRule: RecurrenceRule.MONTHLY,
    })
    expect(expenses[1]).toMatchObject({
      title: 'Monthly rent',
      amount: 120000,
      paidById: alice!.id,
    })
    expect(expenses[1]!.paidFor).toHaveLength(3)

    const processedLinks = await prisma.recurringExpenseLink.findMany({
      where: {
        groupId: group.id,
        currentFrameExpenseId: { not: expenses.at(-1)!.id },
      },
    })
    expect(processedLinks.every((link) => link.nextExpenseCreatedAt)).toBe(true)
  })
})
