/**
 * @jest-environment node
 */
import 'fake-indexeddb/auto'
import {
  classifyError,
  enqueueExpense,
  flushOfflineQueue,
  isNetworkError,
  listQueuedExpenses,
  QueuedExpense,
  removeQueuedExpense,
  subscribeOfflineQueue,
} from './offline-queue'
import type { ExpenseFormValues } from './schemas'

function values(title: string): ExpenseFormValues {
  return {
    title,
    amount: 1234,
    expenseDate: new Date('2026-10-20T00:00:00.000Z'),
  } as unknown as ExpenseFormValues
}

function trpcError(message: string, data?: { code: string }) {
  return Object.assign(new Error(message), {
    name: 'TRPCClientError',
    data,
    shape: data ? { message, data } : undefined,
  })
}

async function clear() {
  for (const item of await listQueuedExpenses())
    await removeQueuedExpense(item.expenseId)
}

beforeEach(clear)

describe('offline queue', () => {
  it('stores, lists per group and removes', async () => {
    await enqueueExpense({
      groupId: 'g1',
      expenseId: 'a'.repeat(21),
      expenseFormValues: values('A'),
      queuedAt: 2,
    })
    await enqueueExpense({
      groupId: 'g1',
      expenseId: 'b'.repeat(21),
      expenseFormValues: values('B'),
      participantId: 'p1',
      queuedAt: 1,
    })
    await enqueueExpense({
      groupId: 'g2',
      expenseId: 'c'.repeat(21),
      expenseFormValues: values('C'),
    })

    const g1 = await listQueuedExpenses('g1')
    expect(g1.map((i) => i.expenseFormValues.title)).toEqual(['B', 'A'])
    expect(g1[0].participantId).toBe('p1')
    // structuredClone builds the Date in Node's realm, not jest's sandbox.
    expect(
      Object.prototype.toString.call(g1[0].expenseFormValues.expenseDate),
    ).toBe('[object Date]')
    expect(g1[0].expenseFormValues.expenseDate.toISOString()).toBe(
      '2026-10-20T00:00:00.000Z',
    )
    expect(await listQueuedExpenses()).toHaveLength(3)

    await removeQueuedExpense('a'.repeat(21))
    expect(await listQueuedExpenses('g1')).toHaveLength(1)
  })

  it('re-enqueueing the same id keeps one record', async () => {
    const item = {
      groupId: 'g1',
      expenseId: 'd'.repeat(21),
      expenseFormValues: values('D'),
    }
    await enqueueExpense(item)
    await enqueueExpense(item)
    expect(await listQueuedExpenses()).toHaveLength(1)
  })

  it('notifies subscribers on change', async () => {
    const listener = jest.fn()
    const unsubscribe = subscribeOfflineQueue(listener)
    await enqueueExpense({
      groupId: 'g1',
      expenseId: 'e'.repeat(21),
      expenseFormValues: values('E'),
    })
    expect(listener).toHaveBeenCalled()
    unsubscribe()
  })
})

describe('flushOfflineQueue', () => {
  async function seed(n: number) {
    for (let i = 0; i < n; i++)
      await enqueueExpense({
        groupId: 'g1',
        expenseId: String(i).repeat(21),
        expenseFormValues: values(`T${i}`),
        queuedAt: i,
      })
  }

  it('sends each item once and empties the queue', async () => {
    await seed(2)
    const send = jest.fn().mockResolvedValue({})
    const result = await flushOfflineQueue(send)
    expect(send).toHaveBeenCalledTimes(2)
    expect(result).toEqual({
      synced: ['0'.repeat(21), '1'.repeat(21)],
      remaining: 0,
    })
    expect(await listQueuedExpenses()).toHaveLength(0)
  })

  it('is idempotent: "Expense id already exists" counts as synced', async () => {
    await seed(1)
    const send = jest.fn().mockRejectedValue(
      trpcError('Expense id already exists', {
        code: 'CONFLICT',
      }),
    )
    const result = await flushOfflineQueue(send)
    expect(result.synced).toEqual(['0'.repeat(21)])
    expect(await listQueuedExpenses()).toHaveLength(0)
  })

  it('does not run twice concurrently', async () => {
    await seed(2)
    let release!: () => void
    const gate = new Promise<void>((r) => (release = r))
    const send = jest.fn(async () => {
      await gate
    })
    const first = flushOfflineQueue(send)
    const second = flushOfflineQueue(send)
    expect(second).toBe(first)
    release()
    await Promise.all([first, second])
    expect(send).toHaveBeenCalledTimes(2)
    // A later flush finds nothing left to send.
    await flushOfflineQueue(send)
    expect(send).toHaveBeenCalledTimes(2)
  })

  it('keeps an item the server refuses with lastError and goes on', async () => {
    await seed(2)
    const send = jest.fn(async (item: QueuedExpense) => {
      if (item.expenseId === '0'.repeat(21))
        throw trpcError('Invalid participant ID: x', { code: 'BAD_REQUEST' })
    })
    const result = await flushOfflineQueue(send)
    expect(result).toEqual({ synced: ['1'.repeat(21)], remaining: 1 })
    const [left] = await listQueuedExpenses()
    expect(left.expenseId).toBe('0'.repeat(21))
    expect(left.lastError).toEqual({
      kind: 'server',
      message: 'Invalid participant ID: x',
    })
  })

  it('stops on a network error and keeps everything', async () => {
    await seed(2)
    const send = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    const result = await flushOfflineQueue(send)
    expect(send).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ synced: [], remaining: 2 })
    expect(await listQueuedExpenses()).toHaveLength(2)
  })

  it('keeps items on other server errors', async () => {
    await seed(1)
    const send = jest
      .fn()
      .mockRejectedValue(trpcError('bad input', { code: 'BAD_REQUEST' }))
    await flushOfflineQueue(send)
    const [left] = await listQueuedExpenses()
    expect(left.lastError?.kind).toBe('server')
  })
})

describe('error classification', () => {
  it('tells network and server errors apart', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true)
    const wrapped = Object.assign(new Error('Failed to fetch'), {
      name: 'TRPCClientError',
      cause: new TypeError('Failed to fetch'),
    })
    expect(classifyError(wrapped)).toBe('network')
    expect(classifyError(trpcError('nope', { code: 'BAD_REQUEST' }))).toBe(
      'server',
    )
    expect(classifyError(new Error('boom'))).toBe('server')
  })
})
