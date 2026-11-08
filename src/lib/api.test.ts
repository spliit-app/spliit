import {
  createExpense,
  getGroupExpenses,
  getRecurringExpenseSeries,
  getRecurringExpenseSeriesDetail,
  stopRecurringExpense,
  updateExpense,
} from './api'
import { prisma } from './prisma'
import { ExpenseFormValues } from './schemas'

jest.mock('./prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    activity: { create: jest.fn() },
    expense: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
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
    recurringSeriesId = 'expense-0',
  }: {
    recurrenceRule: string | null
    expenseDate: Date
    nextExpenseDate: Date
    anchorDay: number | null
    recurringSeriesId?: string | null
  }) {
    const currentFrameExpense = {
      id: 'expense-1',
      groupId: 'group-1',
      title: 'Rent',
      amount: 1000,
      categoryId: 0,
      paidById: 'participant-1',
      recurrenceRule,
      recurringSeriesId,
      expenseDate,
      createdAt: new Date(),
      category: null,
      paidBy: { id: 'participant-1' },
      paidFor: [],
      documents: [],
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

  it('carries the series to the next occurrence', async () => {
    const { createExpense } = setUp({
      recurrenceRule: 'MONTHLY',
      expenseDate: new Date(Date.UTC(2025, 0, 31)),
      nextExpenseDate: new Date(Date.UTC(2025, 1, 28)),
      anchorDay: 31,
    })

    await getGroupExpenses('group-1')

    expect(createExpense.mock.calls[0][0].data.recurringSeriesId).toBe(
      'expense-0',
    )
  })

  it('starts the series from the current occurrence when it has none', async () => {
    const { createExpense } = setUp({
      recurrenceRule: 'MONTHLY',
      expenseDate: new Date(Date.UTC(2025, 0, 31)),
      nextExpenseDate: new Date(Date.UTC(2025, 1, 28)),
      anchorDay: 31,
      recurringSeriesId: null,
    })

    await getGroupExpenses('group-1')

    expect(createExpense.mock.calls[0][0].data.recurringSeriesId).toBe(
      'expense-1',
    )
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

  async function updatedData(
    existing: Partial<typeof existingExpense> & Record<string, unknown>,
    values: ExpenseFormValues,
  ) {
    jest.mocked(prisma.group.findUnique).mockResolvedValue({
      id: 'group-1',
      participants: [{ id: 'participant-1' }],
    } as never)
    jest
      .mocked(prisma.expense.findUnique)
      .mockResolvedValue({ ...existingExpense, ...existing } as never)
    await updateExpense('group-1', 'expense-1', values)
    return jest.mocked(prisma.expense.update).mock.calls[0][0].data
  }

  it('starts a series when recurrence is turned on', async () => {
    const data = await updatedData(
      {
        recurrenceRule: 'NONE',
        recurringExpenseLink: null,
        recurringSeriesId: null,
      } as never,
      formValues({}),
    )

    expect(data.recurringSeriesId).toBe('expense-1')
  })

  it('keeps the series when recurrence is turned back on', async () => {
    const data = await updatedData(
      {
        recurrenceRule: 'NONE',
        recurringExpenseLink: null,
        recurringSeriesId: 'expense-0',
      } as never,
      formValues({}),
    )

    expect(data.recurringSeriesId).toBe('expense-0')
  })

  it('clears the anchor day when switching to weekly', async () => {
    const link = await linkUpdate(formValues({ recurrenceRule: 'WEEKLY' }))

    expect(link?.update).toEqual({
      nextExpenseDate: new Date(Date.UTC(2025, 0, 22)),
      anchorDay: null,
    })
  })
})

describe('createExpense', () => {
  const formValues = (
    overrides: Partial<ExpenseFormValues>,
  ): ExpenseFormValues =>
    ({
      expenseDate: new Date(Date.UTC(2025, 0, 15)),
      title: 'Rent',
      category: 0,
      amount: 1000,
      paidBy: 'participant-1',
      paidFor: [{ participant: 'participant-1', shares: 1 }],
      splitMode: 'EVENLY',
      isReimbursement: false,
      documents: [],
      recurrenceRule: 'NONE',
      ...overrides,
    }) as ExpenseFormValues

  async function createdData(values: ExpenseFormValues) {
    jest.mocked(prisma.group.findUnique).mockResolvedValue({
      id: 'group-1',
      participants: [{ id: 'participant-1' }],
    } as never)
    await createExpense(values, 'group-1', undefined, 'expense-9')
    return jest.mocked(prisma.expense.create).mock.calls[0][0].data
  }

  beforeEach(() => jest.clearAllMocks())

  it('starts a series on the new expense when it recurs', async () => {
    const data = await createdData(formValues({ recurrenceRule: 'MONTHLY' }))

    expect(data.recurringSeriesId).toBe('expense-9')
  })

  it('leaves the series empty for a one-off expense', async () => {
    const data = await createdData(formValues({}))

    expect(data.recurringSeriesId).toBeUndefined()
  })
})

describe('getRecurringExpenseSeries', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(prisma.recurringExpenseLink.findMany).mockResolvedValue([])
  })

  it('lists open series including reimbursements', async () => {
    jest.mocked(prisma.expense.findMany).mockResolvedValue([])

    await getRecurringExpenseSeries('group-1')

    expect(
      jest.mocked(prisma.expense.findMany).mock.calls[0][0]?.where,
    ).toEqual({
      groupId: 'group-1',
      recurrenceRule: { not: 'NONE' },
      recurringExpenseLink: { is: { nextExpenseCreatedAt: null } },
    })
  })

  it('sorts series by next expense date, then by title', async () => {
    jest.mocked(prisma.expense.findMany).mockResolvedValue([])

    await getRecurringExpenseSeries('group-1')

    expect(
      jest.mocked(prisma.expense.findMany).mock.calls[0][0]?.orderBy,
    ).toEqual([
      { recurringExpenseLink: { nextExpenseDate: 'asc' } },
      { title: 'asc' },
    ])
  })
})

describe('getRecurringExpenseSeriesDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(prisma.recurringExpenseLink.findMany).mockResolvedValue([])
  })

  it('falls back to the expense id for a series without id', async () => {
    jest.mocked(prisma.expense.findMany).mockResolvedValue([])

    await getRecurringExpenseSeriesDetail('group-1', 'expense-1')

    expect(
      jest.mocked(prisma.expense.findMany).mock.calls[0][0]?.where,
    ).toEqual({
      groupId: 'group-1',
      OR: [{ recurringSeriesId: 'expense-1' }, { id: 'expense-1' }],
    })
  })

  it('returns the occurrence with an open link as the current one', async () => {
    jest.mocked(prisma.expense.findMany).mockResolvedValue([
      {
        id: 'expense-2',
        recurrenceRule: 'MONTHLY',
        recurringExpenseLink: { nextExpenseCreatedAt: null },
      },
      {
        id: 'expense-1',
        recurrenceRule: 'MONTHLY',
        recurringExpenseLink: { nextExpenseCreatedAt: new Date() },
      },
    ] as never)

    const { current, occurrences } = await getRecurringExpenseSeriesDetail(
      'group-1',
      'expense-1',
    )

    expect(current?.id).toBe('expense-2')
    expect(occurrences).toHaveLength(2)
  })

  it('returns no current occurrence once the series is stopped', async () => {
    jest.mocked(prisma.expense.findMany).mockResolvedValue([
      { id: 'expense-2', recurrenceRule: 'NONE', recurringExpenseLink: null },
      {
        id: 'expense-1',
        recurrenceRule: 'MONTHLY',
        recurringExpenseLink: { nextExpenseCreatedAt: new Date() },
      },
    ] as never)

    const { current, occurrences } = await getRecurringExpenseSeriesDetail(
      'group-1',
      'expense-1',
    )

    expect(current).toBeNull()
    expect(occurrences).toHaveLength(2)
  })
})

describe('stopRecurringExpense', () => {
  const currentFrame = {
    id: 'expense-1',
    groupId: 'group-1',
    title: 'Rent',
    recurrenceRule: 'MONTHLY',
    recurringExpenseLink: { id: 'link-1', nextExpenseCreatedAt: null },
  }

  function setUp({
    expense = currentFrame,
    deletedLinks = 1,
  }: { expense?: unknown; deletedLinks?: number } = {}) {
    const deleteLinks = jest.fn(async () => ({ count: deletedLinks }))
    const updateExpense = jest.fn()
    jest.mocked(prisma.recurringExpenseLink.findMany).mockResolvedValue([])
    jest.mocked(prisma.expense.findUnique).mockResolvedValue(expense as never)
    jest.mocked(prisma.$transaction).mockImplementation((async (
      callback: (tx: unknown) => unknown,
    ) =>
      callback({
        recurringExpenseLink: { deleteMany: deleteLinks },
        expense: { update: updateExpense },
      })) as never)
    return { deleteLinks, updateExpense }
  }

  beforeEach(() => jest.clearAllMocks())

  it('stops the current occurrence', async () => {
    const { deleteLinks, updateExpense } = setUp()

    await stopRecurringExpense('group-1', 'expense-1', 'participant-1')

    expect(deleteLinks).toHaveBeenCalledWith({
      where: { currentFrameExpenseId: 'expense-1', nextExpenseCreatedAt: null },
    })
    expect(updateExpense).toHaveBeenCalledWith({
      where: { id: 'expense-1' },
      data: { recurrenceRule: 'NONE' },
    })
    expect(prisma.activity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        groupId: 'group-1',
        activityType: 'UPDATE_EXPENSE',
        participantId: 'participant-1',
        expenseId: 'expense-1',
        data: 'Rent',
      }),
    })
  })

  it('creates the occurrences that are due before stopping', async () => {
    setUp()

    await stopRecurringExpense('group-1', 'expense-1')

    expect(prisma.recurringExpenseLink.findMany).toHaveBeenCalled()
  })

  it('refuses an occurrence that was already followed by the next one', async () => {
    const { updateExpense } = setUp({ deletedLinks: 0 })

    await expect(stopRecurringExpense('group-1', 'expense-1')).rejects.toThrow()
    expect(updateExpense).not.toHaveBeenCalled()
    expect(prisma.activity.create).not.toHaveBeenCalled()
  })

  it('refuses an expense from another group', async () => {
    const { deleteLinks } = setUp({
      expense: { ...currentFrame, groupId: 'group-2' },
    })

    await expect(stopRecurringExpense('group-1', 'expense-1')).rejects.toThrow()
    expect(deleteLinks).not.toHaveBeenCalled()
  })
})
