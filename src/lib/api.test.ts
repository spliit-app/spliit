import { getGroupExpenses, updateExpense } from './api'
import { prisma } from './prisma'
import { ExpenseFormValues } from './schemas'

jest.mock('./prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    activity: { create: jest.fn() },
    expense: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    group: { findUnique: jest.fn() },
    recurringExpenseLink: { findMany: jest.fn(), deleteMany: jest.fn() },
    recurringSeries: { create: jest.fn(), update: jest.fn() },
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

describe('createRecurringExpenses with a series', () => {
  const installmentFrame = (occurrenceNumber: number) => ({
    id: `expense-${occurrenceNumber}`,
    groupId: 'group-1',
    title: 'Fridge',
    amount: occurrenceNumber === 1 ? 501 : 500,
    originalAmount: null,
    categoryId: 0,
    paidById: 'participant-1',
    splitMode: 'EVENLY',
    recurrenceRule: 'MONTHLY',
    expenseDate: new Date(Date.UTC(2025, 0, 10)),
    createdAt: new Date(),
    seriesId: 'series-1',
    occurrenceNumber,
    series: {
      id: 'series-1',
      kind: 'INSTALLMENTS',
      endDate: null,
      occurrenceCount: 2,
      totalAmount: 1001,
      totalOriginalAmount: null,
    },
    category: null,
    paidBy: { id: 'participant-1' },
    paidFor: [
      { expenseId: 'expense-1', participantId: 'participant-1', shares: 100 },
    ],
    documents: [],
  })

  function setUp(frame: ReturnType<typeof installmentFrame>) {
    const createExpense = jest.fn(async ({ data }) => ({
      ...frame,
      ...data,
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
        currentFrameExpenseId: frame.id,
        nextExpenseDate: new Date(Date.UTC(2025, 1, 10)),
        nextExpenseCreatedAt: null,
        anchorDay: 10,
        currentFrameExpense: frame,
      },
    ] as never)
    jest
      .mocked(prisma.$transaction)
      .mockImplementation((async (callback: (tx: unknown) => unknown) =>
        callback(transaction)) as never)
    jest.mocked(prisma.expense.findMany).mockResolvedValue([])
    return { createExpense }
  }

  beforeEach(() => jest.clearAllMocks())

  it('creates the last installment with its part of the total and no link', async () => {
    const { createExpense } = setUp(installmentFrame(1))

    await getGroupExpenses('group-1')

    expect(createExpense).toHaveBeenCalledTimes(1)
    const { data } = createExpense.mock.calls[0][0]
    expect(data).toMatchObject({
      amount: 500,
      occurrenceNumber: 2,
      seriesId: 'series-1',
      recurringExpenseLink: undefined,
    })
  })

  it('closes the link of a series that already ended', async () => {
    const { createExpense } = setUp(installmentFrame(2))

    await getGroupExpenses('group-1')

    expect(createExpense).not.toHaveBeenCalled()
    expect(prisma.recurringExpenseLink.deleteMany).toHaveBeenCalledWith({
      where: { id: 'link-1', nextExpenseCreatedAt: null },
    })
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
    seriesId: 'series-1',
    occurrenceNumber: 2,
    series: {
      id: 'series-1',
      kind: 'RECURRING',
      endDate: null,
      occurrenceCount: null,
      totalAmount: null,
      totalOriginalAmount: null,
      expenses: [
        { id: 'expense-0', occurrenceNumber: 1 },
        { id: 'expense-1', occurrenceNumber: 2 },
      ],
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
      seriesKind: 'RECURRING',
      recurrenceEnd: 'NEVER',
      installmentAmountIsTotal: true,
      ...overrides,
    }) as ExpenseFormValues

  async function update(
    values: ExpenseFormValues,
    expense: object = existingExpense,
  ) {
    jest.mocked(prisma.group.findUnique).mockResolvedValue({
      id: 'group-1',
      participants: [{ id: 'participant-1' }],
    } as never)
    jest.mocked(prisma.expense.findUnique).mockResolvedValue(expense as never)
    jest
      .mocked(prisma.$transaction)
      .mockImplementation((async (callback: (tx: unknown) => unknown) =>
        callback(prisma)) as never)
    await updateExpense('group-1', 'expense-1', values)
    return jest.mocked(prisma.expense.update).mock.calls[0][0].data
  }
  const linkUpdate = async (values: ExpenseFormValues) =>
    (await update(values)).recurringExpenseLink as any

  beforeEach(() => jest.clearAllMocks())

  it('reschedules the next occurrence from the new expense date', async () => {
    const link = await linkUpdate(
      formValues({ expenseDate: new Date(Date.UTC(2025, 0, 31)) }),
    )

    expect(link.upsert.update).toEqual({
      nextExpenseDate: new Date(Date.UTC(2025, 1, 28)),
      anchorDay: 31,
      nextExpenseCreatedAt: null,
    })
  })

  it('keeps the stored schedule when neither the date nor the rule changes', async () => {
    const link = await linkUpdate(formValues({ title: 'New rent' }))

    expect(link.upsert.update).toEqual({
      nextExpenseDate: new Date(Date.UTC(2025, 1, 15)),
      anchorDay: 15,
      nextExpenseCreatedAt: null,
    })
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

    expect(link.upsert.update).toEqual({
      nextExpenseDate: new Date(Date.UTC(2026, 0, 15)),
      anchorDay: 15,
      nextExpenseCreatedAt: null,
    })
  })

  it('clears the anchor day when switching to weekly', async () => {
    const link = await linkUpdate(formValues({ recurrenceRule: 'WEEKLY' }))

    expect(link.upsert.update).toEqual({
      nextExpenseDate: new Date(Date.UTC(2025, 0, 22)),
      anchorDay: null,
      nextExpenseCreatedAt: null,
    })
  })

  it('saves a new end and closes the series when nothing follows', async () => {
    const link = await linkUpdate(
      formValues({
        recurrenceEnd: 'AFTER_OCCURRENCES',
        recurrenceOccurrences: 2,
      }),
    )

    expect(prisma.recurringSeries.update).toHaveBeenCalledWith({
      where: { id: 'series-1' },
      data: { endDate: null, occurrenceCount: 2 },
    })
    expect(link).toEqual({ delete: true })
  })

  it('ignores a recurrence change on a past occurrence', async () => {
    const data = await update(formValues({ recurrenceRule: 'NONE' }), {
      ...existingExpense,
      occurrenceNumber: 1,
      recurringExpenseLink: {
        ...existingExpense.recurringExpenseLink,
        nextExpenseCreatedAt: new Date(),
      },
    })

    expect(data.recurrenceRule).toBe('MONTHLY')
    expect(data.recurringExpenseLink).toEqual({})
    expect(prisma.recurringSeries.update).not.toHaveBeenCalled()
  })

  it('turns an expense that did not repeat into the first of its installments', async () => {
    const data = await update(
      formValues({
        amount: 1001,
        seriesKind: 'INSTALLMENTS',
        recurrenceOccurrences: 2,
      }),
      {
        ...existingExpense,
        recurrenceRule: 'NONE',
        recurringExpenseLink: null,
        seriesId: null,
        occurrenceNumber: null,
        series: null,
      },
    )

    expect(prisma.recurringSeries.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        kind: 'INSTALLMENTS',
        occurrenceCount: 2,
        totalAmount: 1001,
      }),
    })
    expect(data).toMatchObject({ amount: 501, occurrenceNumber: 1 })
    expect(data.recurringExpenseLink).toHaveProperty('upsert')
  })
})
