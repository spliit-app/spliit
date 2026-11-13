import { gzipSync } from 'node:zlib'
import type { PrismaClient } from '@/generated/prisma/client'
import {
  Backup,
  BACKUP_FORMAT,
  BACKUP_MODELS,
  backupDateOfKey,
  backupFileName,
  BackupModel,
  backupsToDelete,
  BackupStorage,
} from '@/lib/backup-format'
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

type BackupReader = Pick<PrismaClient, BackupModel>

/**
 * Reads every row of every model. Dates come out as ISO strings and decimals
 * as strings once serialized, which is what the restore script writes back.
 */
export async function buildBackup(
  db: BackupReader,
  now = new Date(),
): Promise<Backup> {
  const tables = {} as Backup['tables']
  for (const model of BACKUP_MODELS) {
    // Each delegate's findMany has its own signature; calling them through
    // one union is fine since no arguments are passed.
    const delegate = db[model] as unknown as {
      findMany: () => Promise<Record<string, unknown>[]>
    }
    tables[model] = await delegate.findMany()
  }
  return { format: BACKUP_FORMAT, exportedAt: now.toISOString(), tables }
}

export function createBackupS3Client(storage: BackupStorage) {
  // Configured like the expense documents client (see group-deletion.ts).
  return new S3Client({
    credentials: {
      accessKeyId: storage.accessKeyId,
      secretAccessKey: storage.secretAccessKey,
    },
    region: storage.region,
    endpoint: storage.endpoint,
    forcePathStyle: !!storage.endpoint,
  })
}

type S3Sender = Pick<S3Client, 'send'>

export type StoredBackup = { key: string; date: string; size?: number }

/** The stored backups, newest first. */
export async function listBackups(
  s3: S3Sender,
  storage: BackupStorage,
): Promise<StoredBackup[]> {
  const backups: StoredBackup[] = []
  let token: string | undefined
  do {
    const page = await s3.send(
      new ListObjectsV2Command({
        Bucket: storage.bucket,
        Prefix: storage.prefix,
        ContinuationToken: token,
      }),
    )
    for (const object of page.Contents ?? []) {
      const date = object.Key && backupDateOfKey(object.Key, storage.prefix)
      if (object.Key && date)
        backups.push({ key: object.Key, date, size: object.Size })
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined
  } while (token)
  return backups.sort((a, b) => (a.date < b.date ? 1 : -1))
}

export async function readBackupObject(
  s3: S3Sender,
  storage: BackupStorage,
  key: string,
): Promise<Uint8Array> {
  const object = await s3.send(
    new GetObjectCommand({ Bucket: storage.bucket, Key: key }),
  )
  if (!object.Body) throw new Error(`Backup ${key} is empty`)
  return object.Body.transformToByteArray()
}

/**
 * Writes today's gzipped dump (replacing an earlier one from the same day),
 * then deletes the backups that fall out of the retention window. Objects are
 * written without an ACL, so they stay as private as the bucket is.
 */
export async function storeBackup(
  db: BackupReader,
  s3: S3Sender,
  storage: BackupStorage,
  now = new Date(),
) {
  const backup = await buildBackup(db, now)
  const date = backup.exportedAt.slice(0, 10)
  const body = gzipSync(JSON.stringify(backup))
  const key = `${storage.prefix}${backupFileName(date)}`
  await s3.send(
    new PutObjectCommand({
      Bucket: storage.bucket,
      Key: key,
      Body: body,
      ContentType: 'application/gzip',
    }),
  )

  const existing = await listBackups(s3, storage)
  const deleteDates = new Set(backupsToDelete(existing.map((b) => b.date)))
  const deleted = existing.filter((b) => deleteDates.has(b.date))
  // One request per key rather than DeleteObjects, which some S3-compatible
  // providers reject; at most a couple of keys go per daily run.
  for (const { key } of deleted)
    await s3.send(new DeleteObjectCommand({ Bucket: storage.bucket, Key: key }))

  return {
    key,
    bytes: body.byteLength,
    rows: Object.fromEntries(
      BACKUP_MODELS.map((model) => [model, backup.tables[model].length]),
    ),
    kept: existing.length - deleted.length,
    deleted: deleted.map((b) => b.key),
  }
}

type RestoreDelegate = {
  createMany: (args: {
    data: Record<string, unknown>[]
    skipDuplicates?: boolean
  }) => Promise<{ count: number }>
}

type RestoreTarget = Pick<PrismaClient, BackupModel | '$executeRaw'>

const RESTORE_CHUNK_SIZE = 1000

/**
 * Inserts a backup into a database that has the migrations applied but no
 * groups yet. It refuses to touch one that has any, so a backup can never be
 * mixed into live data. Run it inside a transaction, so a failure leaves the
 * database empty. Categories are seeded by the migrations: the ones that
 * already exist are left as they are.
 */
export async function restoreBackup(db: RestoreTarget, backup: Backup) {
  const groups = await db.group.count()
  if (groups > 0)
    throw new Error(
      `The database already has ${groups} group(s). Restore into an empty database.`,
    )

  const rows = {} as Record<BackupModel, number>
  for (const model of BACKUP_MODELS) {
    const data = backup.tables[model] ?? []
    const delegate = db[model] as unknown as RestoreDelegate
    for (let i = 0; i < data.length; i += RESTORE_CHUNK_SIZE)
      await delegate.createMany({
        data: data.slice(i, i + RESTORE_CHUNK_SIZE),
        skipDuplicates: model === 'category',
      })
    rows[model] = data.length
  }
  // Explicit ids do not advance the Category autoincrement sequence.
  await db.$executeRaw`SELECT setval(pg_get_serial_sequence('"Category"', 'id'), GREATEST((SELECT MAX("id") FROM "Category"), 1))`
  return rows
}
