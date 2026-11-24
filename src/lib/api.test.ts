import { createExpense, getGroupExpenses, updateExpense } from './api'
import { prisma } from './prisma'
import { ExpenseFormValues } from './schemas'

jest.mock('./prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    tag: { findMany: jest.fn(), createMany: jest.fn() },
    activity: { create: jest.fn() },
    expense: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    group: { findUnique: jest.fn() },
    recurringExpenseLink: { findMany: jest.fn() },
  },
}))

let mockIdCount = 0
jest.mock('./random', () => ({
  randomId: () => `random-id-${++mockIdCount}`,
}))

describe('getGroupExpenses', () => {
  it('copies the documents of a recurring expense to the next occurrence instead of moving them', async () => {
    const document = {
      id: 'document-1',
      url: 'https://example.com/receipt.jpg',
      width: 800,
      height: 600,
      expenseId: 'expense-1',
    }
    const currentFrameExpense = {
      id: 'expense-1',
      groupId: 'group-1',
      title: 'Rent',
      amount: 1000,
      categoryId: 0,
      paidById: 'participant-1',
      recurrenceRule: 'DAILY',
      createdAt: new Date(),
      category: null,
      paidBy: { id: 'participant-1' },
      paidFor: [
        { expenseId: 'expense-1', participantId: 'participant-1', shares: 1 },
      ],
      documents: [document],
      tags: [{ id: 'trip' }],
    }

    const createExpense = jest.fn(async ({ data }) => ({
      ...currentFrameExpense,
      id: data.id,
      createdAt: new Date(),
    }))
    const transaction = {
      expense: { create: createExpense },
      recurringExpenseLink: { update: jest.fn() },
    }

    jest.mocked(prisma.recurringExpenseLink.findMany).mockResolvedValue([
      {
        id: 'link-1',
        groupId: 'group-1',
        currentFrameExpenseId: 'expense-1',
        // An hour ago, so exactly one daily occurrence is due.
        nextExpenseDate: new Date(Date.now() - 60 * 60 * 1000),
        nextExpenseCreatedAt: null,
        currentFrameExpense,
      },
    ] as never)
    jest
      .mocked(prisma.$transaction)
      .mockImplementation((async (callback: (tx: unknown) => unknown) =>
        callback(transaction)) as never)
    jest.mocked(prisma.expense.findMany).mockResolvedValue([])

    await getGroupExpenses('group-1')

    expect(createExpense).toHaveBeenCalledTimes(1)
    expect(createExpense.mock.calls[0][0].data.tags).toEqual({
      connect: [{ id: 'trip' }],
    })
    const { documents } = createExpense.mock.calls[0][0].data
    expect(documents).toEqual({
      createMany: {
        data: [
          {
            id: expect.any(String),
            url: document.url,
            width: document.width,
            height: document.height,
          },
        ],
      },
    })
    // Reusing the id would point the existing document at the new expense
    // and take it away from the expense it was uploaded for.
    expect(documents.createMany.data[0].id).not.toBe(document.id)
  })
})

describe('createRecurringExpenses', () => {
  const day = (date: Date) => date.toISOString().slice(0, 10)

  function setUp({
    recurrenceRule,
    expenseDate,
    nextExpenseDate,
    anchorDay,
  }: {
    recurrenceRule: string | null
    expenseDate: Date
    nextExpenseDate: Date
    anchorDay: number | null
  }) {
    const currentFrameExpense = {
      id: 'expense-1',
      groupId: 'group-1',
      title: 'Rent',
      amount: 1000,
      categoryId: 0,
      paidById: 'participant-1',
      recurrenceRule,
      expenseDate,
      createdAt: new Date(),
      category: null,
      paidBy: { id: 'participant-1' },
      paidFor: [],
      documents: [],
      tags: [],
    }
    const createExpense = jest.fn(async ({ data }) => ({
      ...currentFrameExpense,
      id: data.id,
      expenseDate: data.expenseDate,
      createdAt: new Date(),
    }))
    const updateLink = jest.fn()
    const transaction = {
      expense: { create: createExpense },
      recurringExpenseLink: { update: updateLink },
    }
    jest.mocked(prisma.recurringExpenseLink.findMany).mockResolvedValue([
      {
        id: 'link-1',
        groupId: 'group-1',
        currentFrameExpenseId: 'expense-1',
        nextExpenseDate,
        nextExpenseCreatedAt: null,
        anchorDay,
        currentFrameExpense,
      },
    ] as never)
    jest
      .mocked(prisma.$transaction)
      .mockImplementation((async (callback: (tx: unknown) => unknown) =>
        callback(transaction)) as never)
    jest.mocked(prisma.expense.findMany).mockResolvedValue([])
    return { createExpense, updateLink }
  }

  beforeEach(() => jest.clearAllMocks())

  it.each([null, 'NONE'])(
    'creates nothing and returns when the rule is %p',
    async (recurrenceRule) => {
      const { createExpense } = setUp({
        recurrenceRule,
        expenseDate: new Date(Date.UTC(2025, 0, 31)),
        nextExpenseDate: new Date(Date.UTC(2025, 1, 28)),
        anchorDay: null,
      })

      await getGroupExpenses('group-1')

      expect(createExpense).not.toHaveBeenCalled()
    },
  )

  it('keeps the stored anchor day across a short month', async () => {
    const { createExpense } = setUp({
      recurrenceRule: 'MONTHLY',
      expenseDate: new Date(Date.UTC(2025, 0, 31)),
      nextExpenseDate: new Date(Date.UTC(2025, 1, 28)),
      anchorDay: 31,
    })

    await getGroupExpenses('group-1')

    const created = createExpense.mock.calls.map(([{ data }]) => data)
    expect(day(created[0].expenseDate)).toBe('2025-02-28')
    expect(day(created[1].expenseDate)).toBe('2025-03-31')
    expect(created[0].recurringExpenseLink.create.anchorDay).toBe(31)
  })

  it('derives the anchor day of a link created before the column existed', async () => {
    const { createExpense, updateLink } = setUp({
      recurrenceRule: 'MONTHLY',
      expenseDate: new Date(Date.UTC(2025, 0, 31)),
      nextExpenseDate: new Date(Date.UTC(2025, 1, 28)),
      anchorDay: null,
    })

    await getGroupExpenses('group-1')

    const created = createExpense.mock.calls.map(([{ data }]) => data)
    expect(day(created[1].expenseDate)).toBe('2025-03-31')
    expect(created[0].recurringExpenseLink.create.anchorDay).toBe(31)
    expect(updateLink.mock.calls[0][0].data.anchorDay).toBe(31)
  })

  it('repeats a yearly expense on 29 February in common years', async () => {
    const { createExpense } = setUp({
      recurrenceRule: 'YEARLY',
      expenseDate: new Date(Date.UTC(2024, 1, 29)),
      nextExpenseDate: new Date(Date.UTC(2025, 1, 28)),
      anchorDay: null,
    })

    await getGroupExpenses('group-1')

    const created = createExpense.mock.calls.map(([{ data }]) => data)
    expect(day(created[0].expenseDate)).toBe('2025-02-28')
    expect(day(created[1].expenseDate)).toBe('2026-02-28')
    expect(created[0].recurringExpenseLink.create.anchorDay).toBe(29)
  })
})

describe('updateExpense', () => {
  const existingExpense = {
    id: 'expense-1',
    groupId: 'group-1',
    title: 'Rent',
    expenseDate: new Date(Date.UTC(2025, 0, 15)),
    recurrenceRule: 'MONTHLY',
    paidFor: [{ expenseId: 'expense-1', participantId: 'participant-1' }],
    documents: [],
    recurringExpenseLink: {
      id: 'link-1',
      nextExpenseCreatedAt: null,
      nextExpenseDate: new Date(Date.UTC(2025, 1, 15)),
      anchorDay: 15,
    },
  }

  const formValues = (
    overrides: Partial<ExpenseFormValues>,
  ): ExpenseFormValues =>
    ({
      expenseDate: existingExpense.expenseDate,
      title: 'Rent',
      category: 0,
      amount: 1000,
      paidBy: 'participant-1',
      paidFor: [{ participant: 'participant-1', shares: 1 }],
      splitMode: 'EVENLY',
      isReimbursement: false,
      documents: [],
      recurrenceRule: 'MONTHLY',
      ...overrides,
    }) as ExpenseFormValues

  async function linkUpdate(values: ExpenseFormValues) {
    jest.mocked(prisma.group.findUnique).mockResolvedValue({
      id: 'group-1',
      participants: [{ id: 'participant-1' }],
    } as never)
    jest
      .mocked(prisma.expense.findUnique)
      .mockResolvedValue(existingExpense as never)
    jest
      .mocked(prisma.$transaction)
      .mockImplementation((async (callback: (tx: unknown) => unknown) =>
        callback(prisma)) as never)
    await updateExpense('group-1', 'expense-1', values)
    return jest.mocked(prisma.expense.update).mock.calls[0][0].data
      .recurringExpenseLink
  }

  beforeEach(() => jest.clearAllMocks())

  it('reschedules the next occurrence from the new expense date', async () => {
    const link = await linkUpdate(
      formValues({ expenseDate: new Date(Date.UTC(2025, 0, 31)) }),
    )

    expect(link).toEqual({
      update: {
        nextExpenseDate: new Date(Date.UTC(2025, 1, 28)),
        anchorDay: 31,
      },
      delete: false,
    })
  })

  it('leaves the link alone when neither the date nor the rule changes', async () => {
    const link = await linkUpdate(formValues({ title: 'New rent' }))

    expect(link).toEqual({ delete: false })
  })

  it('only deletes the link when the rule is switched to NONE', async () => {
    const link = await linkUpdate(
      formValues({
        recurrenceRule: 'NONE',
        expenseDate: new Date(Date.UTC(2025, 0, 31)),
      }),
    )

    expect(link).toEqual({ delete: true })
  })

  it('schedules the next occurrence a year later when switching to yearly', async () => {
    const link = await linkUpdate(formValues({ recurrenceRule: 'YEARLY' }))

    expect(link?.update).toEqual({
      nextExpenseDate: new Date(Date.UTC(2026, 0, 15)),
      anchorDay: 15,
    })
  })

  it('clears the anchor day when switching to weekly', async () => {
    const link = await linkUpdate(formValues({ recurrenceRule: 'WEEKLY' }))

    expect(link?.update).toEqual({
      nextExpenseDate: new Date(Date.UTC(2025, 0, 22)),
      anchorDay: null,
    })
  })
})

describe('expense tags', () => {
  const values = {
    expenseDate: new Date('2026-07-01T00:00:00Z'),
    title: 'Dinner',
    amount: 6000,
    category: 0,
    paidBy: 'alice',
    paidFor: [{ participant: 'alice', shares: 1 }],
    splitMode: 'EVENLY',
    isReimbursement: false,
    saveDefaultSplittingOptions: false,
    documents: [],
    recurrenceRule: 'NONE',
  } as ExpenseFormValues

  beforeEach(() => {
    jest.clearAllMocks()
    jest
      .mocked(prisma.$transaction)
      .mockImplementation((async (callback: (tx: unknown) => unknown) =>
        callback(prisma)) as never)
    jest.mocked(prisma.group.findUnique).mockResolvedValue({
      id: 'group-1',
      participants: [{ id: 'alice' }],
    } as never)
    jest.mocked(prisma.expense.findUnique).mockResolvedValue({
      id: 'expense-1',
      groupId: 'group-1',
      ...values,
      paidFor: [],
      documents: [],
      recurringExpenseLink: null,
    } as never)
    jest.mocked(prisma.recurringExpenseLink.findMany).mockResolvedValue([])
    jest.mocked(prisma.expense.findMany).mockResolvedValue([])
    jest.mocked(prisma.tag.findMany).mockResolvedValue([])
    jest
      .mocked(prisma.expense.create)
      .mockResolvedValue({ id: 'expense-1' } as never)
  })

  it('creates tags only in the expense group and reuses equivalent names', async () => {
    jest
      .mocked(prisma.tag.findMany)
      .mockResolvedValueOnce([{ id: 'trip' }, { id: 'work' }] as never)

    await createExpense(
      {
        ...values,
        tags: [
          { name: ' Summer trip ' },
          { name: 'summer TRIP' },
          { name: 'Work' },
        ],
      },
      'group-1',
    )

    expect(prisma.tag.createMany).toHaveBeenCalledWith({
      data: [
        {
          id: expect.any(String),
          groupId: 'group-1',
          name: 'Summer trip',
          normalizedName: 'summer trip',
        },
        {
          id: expect.any(String),
          groupId: 'group-1',
          name: 'Work',
          normalizedName: 'work',
        },
      ],
      skipDuplicates: true,
    })
    expect(prisma.tag.findMany).toHaveBeenLastCalledWith({
      where: {
        groupId: 'group-1',
        OR: [
          { id: { in: [] } },
          { normalizedName: { in: ['summer trip', 'work'] } },
        ],
      },
      select: { id: true },
    })
    expect(prisma.expense.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tags: { connect: [{ id: 'trip' }, { id: 'work' }] },
          amount: 6000,
        }),
      }),
    )
  })

  it('inserts overlapping new tags in the same normalized order for either selection order', async () => {
    for (const names of [
      ['Ｗｏｒｋ', 'Summer trip'],
      ['summer trip', 'WORK'],
    ]) {
      await createExpense(
        { ...values, tags: names.map((name) => ({ name })) },
        'group-1',
      )
    }
    const inserts = jest.mocked(prisma.tag.createMany).mock.calls
    expect(inserts).toHaveLength(2)
    for (const [input] of inserts) {
      expect(input).toEqual(
        expect.objectContaining({
          data: [
            expect.objectContaining({ normalizedName: 'summer trip' }),
            expect.objectContaining({ normalizedName: 'work' }),
          ],
        }),
      )
    }
  })

  it('does not recreate deleted or foreign-group IDs when saving stale selections', async () => {
    await updateExpense('group-1', 'expense-1', {
      ...values,
      tags: [
        { id: 'deleted', name: 'Work' },
        { id: 'foreign', name: 'Trip' },
      ],
    })
    expect(prisma.tag.createMany).not.toHaveBeenCalled()
    expect(prisma.tag.findMany).toHaveBeenLastCalledWith({
      where: {
        groupId: 'group-1',
        OR: [
          { id: { in: ['deleted', 'foreign'] } },
          { normalizedName: { in: [] } },
        ],
      },
      select: { id: true },
    })
    expect(prisma.expense.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tags: { set: [] } }),
      }),
    )
  })

  it('preserves assignments when tags are omitted and clears only when explicitly empty', async () => {
    await updateExpense('group-1', 'expense-1', values)
    expect(prisma.expense.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: 'expense-1', groupId: 'group-1' },
        data: expect.objectContaining({ tags: undefined }),
      }),
    )
    expect(prisma.tag.createMany).not.toHaveBeenCalled()

    await updateExpense('group-1', 'expense-1', { ...values, tags: [] })
    expect(prisma.expense.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tags: { set: [] } }),
      }),
    )
    expect(prisma.expense.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'expense-1', groupId: 'group-1' },
      }),
    )
  })

  it.each(['Café', 'Cafe\u0301', ' ＣＡＦÉ '])(
    'normalizes tag search %s while preserving title and notes search',
    async (filter) => {
      await getGroupExpenses('group-1', { filter })
      expect(prisma.expense.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: filter, mode: 'insensitive' } },
              { notes: { contains: filter, mode: 'insensitive' } },
              { tags: { some: { normalizedName: { contains: 'café' } } } },
            ],
          }),
        }),
      )
    },
  )

  it('combines group ownership, any-tag membership and text search before pagination', async () => {
    await getGroupExpenses('group-1', {
      offset: 20,
      length: 21,
      filter: 'trip',
      tagIds: ['trip', 'work'],
    })
    expect(prisma.expense.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          groupId: 'group-1',
          AND: [
            {
              OR: [
                {
                  tags: {
                    some: { id: { in: ['trip', 'work'] }, groupId: 'group-1' },
                  },
                },
              ],
            },
          ],
          OR: expect.arrayContaining([
            {
              tags: {
                some: { normalizedName: { contains: 'trip' } },
              },
            },
          ]),
        },
        skip: 20,
        take: 21,
      }),
    )

    await getGroupExpenses('group-1', {
      tagIds: ['trip'],
      untagged: true,
      filter: 'dinner',
    })
    expect(prisma.expense.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          groupId: 'group-1',
          AND: [
            {
              OR: [
                {
                  tags: { some: { id: { in: ['trip'] }, groupId: 'group-1' } },
                },
                { tags: { none: {} } },
              ],
            },
          ],
          OR: expect.arrayContaining([
            { title: { contains: 'dinner', mode: 'insensitive' } },
          ]),
        },
      }),
    )

    await getGroupExpenses('group-1', { untagged: true })
    expect(prisma.expense.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          groupId: 'group-1',
          AND: [{ OR: [{ tags: { none: {} } }] }],
          OR: undefined,
        },
      }),
    )
  })
})
