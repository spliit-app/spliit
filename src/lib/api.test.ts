import { getGroupExpenses } from './api'
import { prisma } from './prisma'

jest.mock('./prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    expense: { findMany: jest.fn() },
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
