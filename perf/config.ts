/**
 * Sizing and run knobs for the performance suite.
 *
 * Everything the seeder writes and everything `budgets.ts` asserts is derived
 * from this one object, so a resized dataset stays internally consistent: raise
 * PERF_GROUPS and the expected query count for the home screen follows along.
 * That is why budgets are written as formulas over `config` rather than as bare
 * numbers -- a hardcoded 61 would silently become wrong the first time someone
 * ran the suite with a different dataset.
 */

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === '') return fallback
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(
      `${name} must be a positive integer, got ${JSON.stringify(raw)}`,
    )
  }
  return parsed
}

export const config = {
  /**
   * How many groups the seeder creates, and therefore how many ids the home
   * screen sends to `groups.list` / `groups.balances.forUser`. 20 is a busy but
   * realistic `recentGroups` local-storage list.
   */
  groups: intFromEnv('PERF_GROUPS', 20),

  /** Group 1 is the large one -- everything about scrolling and unpaged loads is measured against it. */
  largeGroupExpenses: intFromEnv('PERF_LARGE_GROUP_EXPENSES', 2000),
  largeGroupParticipants: intFromEnv('PERF_LARGE_GROUP_PARTICIPANTS', 20),

  /** Groups 2..N. Small, but they still each cost a full expense load in `balances.forUser`. */
  smallGroupExpenses: intFromEnv('PERF_SMALL_GROUP_EXPENSES', 30),
  smallGroupParticipants: intFromEnv('PERF_SMALL_GROUP_PARTICIPANTS', 5),

  /** Timed iterations per step, after `warmup` untimed ones. */
  iterations: intFromEnv('PERF_ITERATIONS', 30),
  warmup: intFromEnv('PERF_WARMUP', 5),

  /**
   * Must match PAGE_SIZE in src/app/groups/[groupId]/expenses/expense-list.tsx.
   * If that changes, this should change with it -- the point is to measure the
   * page the app actually requests.
   */
  pageSize: 20,
} as const

/** Base URL of the app under test. `scripts/perf.sh` sets PERF_HOST_PORT. */
export const baseUrl =
  process.env['PERF_BASE_URL'] ??
  `http://localhost:${process.env['PERF_HOST_PORT'] ?? '3100'}`

/**
 * Connection string for the seeder. This is deliberately NOT the app's
 * POSTGRES_PRISMA_URL: the app reaches postgres as `db:5432` inside the compose
 * network, while the seeder runs on the host and reaches the published port.
 */
export const seedDatabaseUrl =
  process.env['PERF_DATABASE_URL'] ??
  `postgresql://postgres:perf@localhost:${process.env['PERF_DB_PORT'] ?? '55432'}/spliit_perf`

export const groupId = (index: number) =>
  `perf-group-${String(index).padStart(2, '0')}`

export const participantId = (group: number, participant: number) =>
  `perf-p-${String(group).padStart(2, '0')}-${String(participant).padStart(3, '0')}`

export const expenseId = (group: number, expense: number) =>
  `perf-e-${String(group).padStart(2, '0')}-${String(expense).padStart(6, '0')}`

/** The large group, addressed by every `view-group` and `view-expense` step. */
export const LARGE_GROUP = 1

export const expenseCountFor = (group: number) =>
  group === LARGE_GROUP ? config.largeGroupExpenses : config.smallGroupExpenses

export const participantCountFor = (group: number) =>
  group === LARGE_GROUP
    ? config.largeGroupParticipants
    : config.smallGroupParticipants

/**
 * Offset used by the `deep-page` step. Halfway through the large group, so it
 * scales with the dataset and always lands on a full page of results.
 */
export const deepPageOffset =
  Math.floor(config.largeGroupExpenses / 2 / config.pageSize) * config.pageSize

/**
 * Every 10th expense in the large group gets this token in its title, so the
 * search step matches an exactly known number of rows. See `seed.ts`.
 */
export const SEARCH_TOKEN = 'Zzyzx'

export const searchMatchCount = Math.floor(config.largeGroupExpenses / 10)

/**
 * How many participants an expense is split between. Shared by the seeder and
 * the budgets so the expected row count is never a copy of the formula that
 * produced it.
 */
export const paidForCountFor = (group: number, expenseIndex: number) =>
  2 + (expenseIndex % Math.max(1, participantCountFor(group) - 1))

/** The expense addressed by the `view-expense` scenario. */
export const targetExpenseIndex = Math.floor(config.largeGroupExpenses / 2)
