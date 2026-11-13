/**
 * Offline queue for new expenses.
 *
 * When the expense form cannot reach the server, the create call is stored in
 * IndexedDB and replayed later by `flushOfflineQueue`. Records are keyed by the
 * expense id the form minted, so a replay is idempotent: the server refuses a
 * reused id with "Expense id already exists", which here means "already saved".
 *
 * IndexedDB stores values with structured clone, so `expenseFormValues.
 * expenseDate` stays a Date.
 */
import type { ExpenseFormValues } from '@/lib/schemas'

const DB_NAME = 'spliit-offline'
const DB_VERSION = 1
const STORE = 'expenses'
const CHANNEL = 'spliit-offline-queue'
const LOCK = 'spliit-offline-queue-flush'

export type QueueErrorKind = 'server' | 'network'

export type QueuedExpense = {
  groupId: string
  expenseId: string
  expenseFormValues: ExpenseFormValues
  participantId?: string
  queuedAt: number
  lastError?: { kind: QueueErrorKind; message: string }
}

let dbPromise: Promise<IDBDatabase> | null = null

function getIndexedDB(): IDBFactory | undefined {
  return typeof indexedDB === 'undefined' ? undefined : indexedDB
}

export function isOfflineQueueSupported() {
  return getIndexedDB() !== undefined
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  const idb = getIndexedDB()
  if (!idb) return Promise.reject(new Error('IndexedDB is not available'))
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = idb.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'expenseId' })
        store.createIndex('groupId', 'groupId', { unique: false })
      }
    }
    request.onsuccess = () => {
      const db = request.result
      // Another tab upgrading the schema: let it, and reopen next time.
      db.onversionchange = () => {
        db.close()
        dbPromise = null
      }
      resolve(db)
    }
    request.onerror = () => {
      dbPromise = null
      reject(request.error)
    }
  })
  return dbPromise
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb()
  const tx = db.transaction(STORE, mode)
  const result = promisify(run(tx.objectStore(STORE)))
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
  return result
}

// --- change notifications -------------------------------------------------

type Listener = () => void
const listeners = new Set<Listener>()
let channel: BroadcastChannel | null | undefined

function getChannel() {
  if (channel !== undefined) return channel
  channel =
    typeof BroadcastChannel === 'undefined'
      ? null
      : new BroadcastChannel(CHANNEL)
  if (channel) channel.onmessage = () => listeners.forEach((l) => l())
  // Node's BroadcastChannel (tests) would otherwise keep the process alive.
  ;(channel as { unref?: () => void } | null)?.unref?.()
  return channel
}

function notify() {
  listeners.forEach((listener) => listener())
  try {
    getChannel()?.postMessage('changed')
  } catch {
    // A closed channel only loses the cross-tab hint.
  }
}

/** Calls `listener` whenever the queue changes, in this tab or another. */
export function subscribeOfflineQueue(listener: Listener): () => void {
  getChannel()
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// --- queue API ------------------------------------------------------------

export async function enqueueExpense(
  item: Omit<QueuedExpense, 'queuedAt' | 'lastError'> & { queuedAt?: number },
): Promise<void> {
  const record: QueuedExpense = {
    groupId: item.groupId,
    expenseId: item.expenseId,
    expenseFormValues: item.expenseFormValues,
    queuedAt: item.queuedAt ?? Date.now(),
  }
  if (item.participantId !== undefined)
    record.participantId = item.participantId
  await withStore('readwrite', (store) => store.put(record))
  notify()
}

/** Queued expenses, oldest first; only `groupId`'s when given. */
export async function listQueuedExpenses(
  groupId?: string,
): Promise<QueuedExpense[]> {
  const items = await withStore<QueuedExpense[]>('readonly', (store) =>
    groupId === undefined
      ? store.getAll()
      : store.index('groupId').getAll(groupId),
  )
  return items.sort((a, b) => a.queuedAt - b.queuedAt)
}

export async function removeQueuedExpense(expenseId: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(expenseId))
  notify()
}

async function setLastError(
  item: QueuedExpense,
  lastError: QueuedExpense['lastError'],
) {
  await withStore('readwrite', (store) => store.put({ ...item, lastError }))
}

// --- error classification -------------------------------------------------

type MaybeTrpcError = {
  name?: string
  message?: string
  data?: { code?: string; httpStatus?: number } | null
  shape?: unknown
  cause?: unknown
}

/**
 * True when the request never got a server answer: fetch's TypeError, or a
 * TRPCClientError that wraps one (no `data`/`shape` from the server).
 */
export function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  if (error instanceof TypeError) return true
  const err = error as MaybeTrpcError
  if (err.name === 'TRPCClientError') {
    if (err.data || err.shape) return false
    return err.cause instanceof TypeError || err.cause === undefined
  }
  return false
}

export function isDuplicateExpenseError(error: unknown): boolean {
  const message = (error as MaybeTrpcError | null)?.message
  return (
    typeof message === 'string' && message.includes('Expense id already exists')
  )
}

export function classifyError(error: unknown): QueueErrorKind {
  return isNetworkError(error) ? 'network' : 'server'
}

// --- flush ----------------------------------------------------------------

export type FlushResult = {
  /** Expenses now on the server (sent, or already there). */
  synced: string[]
  /** Expenses left in the queue. */
  remaining: number
}

let flushing: Promise<FlushResult> | null = null

/**
 * Runs `run` while holding a Web Lock, so two tabs of the same browser do not
 * replay the queue at the same time. Without the Web Locks API it just runs:
 * the server still refuses a reused id, so a race only costs a request.
 */
function withFlushLock<T>(run: () => Promise<T>): Promise<T> {
  const locks =
    typeof navigator === 'undefined'
      ? undefined
      : (navigator as Navigator & { locks?: LockManager }).locks
  if (!locks) return run()
  return locks.request(LOCK, run)
}

/**
 * Sends every queued expense through `send`, oldest first. Only one flush runs
 * at a time (per tab, and across tabs where the Web Locks API exists); a call
 * during a flush gets the running flush's promise.
 *
 * - success, or "Expense id already exists": removed from the queue
 * - network error: stops (still offline), item kept
 * - other server error: kept with `lastError.kind === 'server'`, others still
 *   tried; the list shows it with a "Discard" button
 */
export function flushOfflineQueue(
  send: (item: QueuedExpense) => Promise<unknown>,
): Promise<FlushResult> {
  if (flushing) return flushing
  flushing = withFlushLock(async () => {
    const synced: string[] = []
    let remaining = 0
    const items = await listQueuedExpenses()
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      try {
        await send(item)
      } catch (error) {
        if (!isDuplicateExpenseError(error)) {
          const kind = classifyError(error)
          const message =
            error instanceof Error ? error.message : String(error ?? '')
          await setLastError(item, { kind, message })
          if (kind === 'network') {
            remaining += items.length - i
            break
          }
          remaining++
          continue
        }
      }
      await withStore('readwrite', (store) => store.delete(item.expenseId))
      synced.push(item.expenseId)
    }
    notify()
    return { synced, remaining }
  }).finally(() => {
    flushing = null
  })
  return flushing
}
