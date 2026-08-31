/**
 * Seeds the performance database with a deterministic dataset.
 *
 * Talks to postgres through `pg` rather than through Prisma, for two reasons.
 * The generated Prisma 7 client is ESM-only and cannot be required from the
 * CommonJS context ts-node gives these scripts; and multi-row INSERTs are far
 * faster than `createMany` for the tens of thousands of rows this writes.
 * Going through `src/lib/api.ts` would be slower still -- that path writes one
 * expense per call and logs an activity for each.
 *
 * Three properties of this data are load-bearing for the budgets:
 *
 * 1. **Fixed seed, fixed timestamps.** `budgets.ts` asserts on response byte
 *    sizes, which are only stable if the rows are identical every run.
 *
 * 2. **Total ordering is unambiguous.** The expense list sorts by
 *    `[{expenseDate: desc}, {createdAt: desc}]`. If two rows tied on both,
 *    postgres could return them in either order and the byte counts would flap.
 *    Every expense therefore gets a unique `createdAt`.
 *
 * 3. **Nothing recurs.** `getGroupExpenses` calls `createRecurringExpenses()`
 *    on every read (src/lib/api.ts), which *writes* when a frame is due -- during
 *    a benchmark that would move both row and query counts between iterations.
 *    Every expense is `NONE` with no `RecurringExpenseLink`, so that pass finds
 *    nothing to do and stays a single constant-cost query.
 */
import { Client } from 'pg'
import {
  SEARCH_TOKEN,
  config,
  expenseCountFor,
  expenseId,
  groupId,
  paidForCountFor,
  participantCountFor,
  participantId,
  seedDatabaseUrl,
} from './config'
import { makeRandom } from './random'

const TITLES = [
  'Groceries',
  'Dinner',
  'Taxi',
  'Train tickets',
  'Hotel',
  'Museum',
  'Coffee',
  'Brunch',
  'Petrol',
  'Parking',
  'Snacks',
  'Drinks',
  'Cinema',
  'Supermarket',
  'Pharmacy',
  'Bakery',
  'Lunch',
  'Ferry',
]

const NAMES = [
  'Ada',
  'Bruno',
  'Chiara',
  'Dmitri',
  'Elena',
  'Farid',
  'Greta',
  'Hugo',
  'Ines',
  'Jonas',
  'Kira',
  'Lars',
  'Mira',
  'Noor',
  'Otto',
  'Pia',
  'Quentin',
  'Rosa',
  'Sven',
  'Tuva',
]

/**
 * Fixed epoch for every generated timestamp. `new Date()` would change the
 * payload on each run and defeat the byte budgets.
 */
const EPOCH = Date.UTC(2025, 0, 1, 12, 0, 0)
const DAY_MS = 24 * 60 * 60 * 1000

/** Rows per INSERT. 500 x 15 columns stays well inside the 65535 parameter cap. */
const CHUNK = 500

const pad = (value: number, width: number) => String(value).padStart(width, '0')

/** `expenseDate` is a DATE column: format explicitly so no timezone shifts it. */
function toDateOnly(ms: number): string {
  const d = new Date(ms)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1, 2)}-${pad(d.getUTCDate(), 2)}`
}

/** `createdAt` is TIMESTAMP WITHOUT TIME ZONE: same reasoning. */
function toTimestamp(ms: number): string {
  const d = new Date(ms)
  return (
    `${toDateOnly(ms)} ${pad(d.getUTCHours(), 2)}:${pad(d.getUTCMinutes(), 2)}:` +
    `${pad(d.getUTCSeconds(), 2)}.${pad(d.getUTCMilliseconds(), 3)}`
  )
}

/**
 * Builds `INSERT INTO t (cols) VALUES ($1,$2,...),($3,$4,...)` and runs it in
 * chunks. `casts` maps a column index to a postgres type, needed for the enum
 * columns where an untyped parameter cannot be inferred.
 */
async function insertRows(
  client: Client,
  table: string,
  columns: string[],
  rows: unknown[][],
  casts: Record<number, string> = {},
) {
  const columnList = columns.map((c) => `"${c}"`).join(', ')

  for (let start = 0; start < rows.length; start += CHUNK) {
    const batch = rows.slice(start, start + CHUNK)
    const values: unknown[] = []
    const tuples = batch.map((row) => {
      const placeholders = row.map((value, column) => {
        values.push(value)
        const cast = casts[column]
        return cast ? `$${values.length}::${cast}` : `$${values.length}`
      })
      return `(${placeholders.join(', ')})`
    })

    await client.query(
      `INSERT INTO "${table}" (${columnList}) VALUES ${tuples.join(', ')}`,
      values,
    )
  }
}

async function main() {
  const client = new Client({ connectionString: seedDatabaseUrl })
  await client.connect()

  try {
    // RESTART IDENTITY CASCADE, but never on Category (populated by migration
    // 20240108194443_add_categories -- expenses reference it) or on
    // _prisma_migrations.
    await client.query(`
      TRUNCATE TABLE
        "ExpensePaidFor", "ExpenseDocument", "RecurringExpenseLink",
        "Activity", "Expense", "Participant", "Group"
      RESTART IDENTITY CASCADE
    `)

    const { rows: categories } = await client.query<{ id: number }>(
      'SELECT id FROM "Category" ORDER BY id ASC',
    )
    if (categories.length === 0) {
      throw new Error(
        'No categories found. The database is missing its migrations -- run `prisma migrate deploy` first.',
      )
    }

    let totalExpenses = 0

    for (let g = 1; g <= config.groups; g++) {
      // Seeded per group, so raising PERF_GROUPS does not reshuffle the data of
      // the groups that were already there.
      const random = makeRandom(0x5eed + g)
      const participants = participantCountFor(g)
      const expenses = expenseCountFor(g)

      await insertRows(
        client,
        'Group',
        ['id', 'name', 'currency', 'currencyCode', 'createdAt'],
        [
          [
            groupId(g),
            `Perf Group ${pad(g, 2)}`,
            '$',
            'USD',
            toTimestamp(EPOCH),
          ],
        ],
      )

      await insertRows(
        client,
        'Participant',
        ['id', 'name', 'groupId'],
        Array.from({ length: participants }, (_, p) => [
          participantId(g, p),
          `${NAMES[p % NAMES.length]} ${p}`,
          groupId(g),
        ]),
      )

      const expenseRows = Array.from({ length: expenses }, (_, i) => {
        // Every 10th expense carries SEARCH_TOKEN, so the search step matches an
        // exactly known number of rows (config.searchMatchCount).
        const title =
          i % 10 === 0
            ? `${SEARCH_TOKEN} ${random.pick(TITLES)}`
            : `${random.pick(TITLES)} ${i}`

        return {
          id: expenseId(g, i),
          title,
          amount: random.int(250, 25000),
          // Three expenses per day, and a strictly decreasing createdAt, so
          // (expenseDate desc, createdAt desc) is a total order equal to `i`.
          expenseDate: toDateOnly(EPOCH - Math.floor(i / 3) * DAY_MS),
          createdAt: toTimestamp(EPOCH - i * 1000),
          categoryId: categories[i % categories.length]!.id,
          paidById: participantId(g, i % participants),
          // A minority of reimbursements, as in a real group.
          isReimbursement: i % 17 === 0,
          splitMode: i % 7 === 0 ? 'BY_SHARES' : 'EVENLY',
        }
      })

      await insertRows(
        client,
        'Expense',
        [
          'id',
          'title',
          'amount',
          'expenseDate',
          'createdAt',
          'categoryId',
          'paidById',
          'groupId',
          'isReimbursement',
          'splitMode',
          'recurrenceRule',
        ],
        expenseRows.map((e) => [
          e.id,
          e.title,
          e.amount,
          e.expenseDate,
          e.createdAt,
          e.categoryId,
          e.paidById,
          groupId(g),
          e.isReimbursement,
          e.splitMode,
          'NONE',
        ]),
        { 9: '"SplitMode"', 10: '"RecurrenceRule"' },
      )

      await insertRows(
        client,
        'ExpensePaidFor',
        ['expenseId', 'participantId', 'shares'],
        expenseRows.flatMap((expense, i) =>
          Array.from({ length: paidForCountFor(g, i) }, (_, s) => [
            expense.id,
            participantId(g, (i + s) % participants),
            expense.splitMode === 'BY_SHARES' ? 1 + (s % 3) : 1,
          ]),
        ),
      )

      totalExpenses += expenses
    }

    console.log(
      `Seeded ${config.groups} groups / ${totalExpenses} expenses ` +
        `(large group ${groupId(1)}: ${config.largeGroupExpenses} expenses, ` +
        `${config.largeGroupParticipants} participants).`,
    )
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
