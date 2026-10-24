import { gunzipSync } from 'node:zlib'

// Pure helpers shared by the backup cron route (src/lib/backups.ts) and the
// download and restore scripts (src/scripts/*-backup.ts). Nothing here touches
// the database or the network.

/** Identifies the layout of a backup file, so a restore can refuse others. */
export const BACKUP_FORMAT = 'spliit-backup-1'

/**
 * Every Prisma model, in an order that can be inserted without breaking a
 * foreign key: a model only comes after the models it references.
 */
export const BACKUP_MODELS = [
  'category',
  'group',
  'participant',
  'expense',
  'expenseDocument',
  'expensePaidFor',
  'recurringExpenseLink',
  'activity',
] as const

export type BackupModel = (typeof BACKUP_MODELS)[number]

export type Backup = {
  format: typeof BACKUP_FORMAT
  exportedAt: string
  tables: Record<BackupModel, Record<string, unknown>[]>
}

/** How many of the newest daily backups are kept. */
export const KEEP_DAILY = 30
/** How many months keep their first backup, once it is out of the daily window. */
export const KEEP_MONTHLY = 12

/**
 * The dates (`YYYY-MM-DD`) of the backups to delete: everything except the
 * newest `KEEP_DAILY` days and the first backup of each of the newest
 * `KEEP_MONTHLY` months.
 */
export function backupsToDelete(dates: string[]): string[] {
  const sorted = Array.from(new Set(dates)).sort().reverse()
  const keep = new Set(sorted.slice(0, KEEP_DAILY))
  // Newest first, so the last date seen for a month is its first backup.
  const firstOfMonth = new Map<string, string>()
  for (const date of sorted) firstOfMonth.set(date.slice(0, 7), date)
  Array.from(firstOfMonth.entries())
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, KEEP_MONTHLY)
    .forEach(([, date]) => keep.add(date))
  return sorted.filter((date) => !keep.has(date))
}

export function backupFileName(date: string) {
  return `spliit-backup-${date}.json.gz`
}

/** The date of a backup object key, or null for any other object. */
export function backupDateOfKey(key: string, prefix: string): string | null {
  if (!key.startsWith(prefix)) return null
  return (
    /^spliit-backup-(\d{4}-\d{2}-\d{2})\.json\.gz$/.exec(
      key.slice(prefix.length),
    )?.[1] ?? null
  )
}

export type BackupStorage = {
  bucket: string
  prefix: string
  accessKeyId: string
  secretAccessKey: string
  region: string
  endpoint?: string
}

// `process.env`, or the parsed `env`; only its string values are read.
type EnvSource = { [name: string]: unknown }

const valueOf = (source: EnvSource, name: string) => {
  const value = source[name]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

/**
 * Where backups are stored, from `BACKUP_S3_*`, each falling back to its
 * `S3_UPLOAD_*` counterpart except the bucket, which has to be named on
 * purpose: the documents bucket is often publicly readable. Null when
 * `BACKUP_S3_BUCKET` is unset; `missing` lists what else is needed.
 */
export function resolveBackupStorage(source: EnvSource): {
  storage: BackupStorage | null
  missing: string[]
} {
  const bucket = valueOf(source, 'BACKUP_S3_BUCKET')
  if (!bucket) return { storage: null, missing: [] }
  const pick = (name: string) =>
    valueOf(source, `BACKUP_S3_${name}`) ?? valueOf(source, `S3_UPLOAD_${name}`)
  const accessKeyId = pick('KEY')
  const secretAccessKey = pick('SECRET')
  const region = pick('REGION')
  const missing = [
    !accessKeyId && 'BACKUP_S3_KEY',
    !secretAccessKey && 'BACKUP_S3_SECRET',
    !region && 'BACKUP_S3_REGION',
  ].filter((name): name is string => !!name)
  if (!accessKeyId || !secretAccessKey || !region)
    return { storage: null, missing }

  let prefix = valueOf(source, 'BACKUP_S3_PREFIX') ?? 'backups/'
  prefix = prefix.replace(/^\/+/, '')
  if (prefix && !prefix.endsWith('/')) prefix += '/'

  return {
    storage: {
      bucket,
      prefix,
      accessKeyId,
      secretAccessKey,
      region,
      endpoint: pick('ENDPOINT'),
    },
    missing: [],
  }
}

/**
 * Reads a backup file, gzipped (as stored by the cron job) or plain JSON (as
 * returned by `?download=1`), and checks it is one this version can restore.
 */
export function parseBackup(bytes: Uint8Array): Backup {
  const isGzip = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b
  const text = Buffer.from(isGzip ? gunzipSync(bytes) : bytes).toString('utf8')
  const backup = JSON.parse(text) as Partial<Backup> | null
  if (!backup || backup.format !== BACKUP_FORMAT)
    throw new Error(
      `Unknown backup format ${JSON.stringify(backup?.format)}, expected "${BACKUP_FORMAT}"`,
    )
  if (typeof backup.tables !== 'object' || backup.tables === null)
    throw new Error('The backup has no tables')
  for (const model of BACKUP_MODELS) {
    const rows = backup.tables[model]
    if (rows !== undefined && !Array.isArray(rows))
      throw new Error(`The backup's "${model}" table is not a list of rows`)
  }
  return backup as Backup
}
