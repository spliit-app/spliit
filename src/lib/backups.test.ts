import { gunzipSync } from 'node:zlib'
import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import {
  Backup,
  BACKUP_FORMAT,
  BACKUP_MODELS,
  backupFileName,
  BackupStorage,
} from './backup-format'
import { buildBackup, restoreBackup, storeBackup } from './backups'

// The real SDK resolves to its browser build under jsdom, which Jest cannot
// load. The code under test only builds commands and hands them to `send`.
jest.mock('@aws-sdk/client-s3', () => {
  class Command {
    constructor(public input: Record<string, any>) {}
  }
  return {
    S3Client: class {},
    PutObjectCommand: class extends Command {},
    GetObjectCommand: class extends Command {},
    ListObjectsV2Command: class extends Command {},
    DeleteObjectCommand: class extends Command {},
  }
})

const storage: BackupStorage = {
  bucket: 'spliit-backups',
  prefix: 'backups/',
  accessKeyId: 'k',
  secretAccessKey: 's',
  region: 'eu-north-1',
}

/** A stand-in for the Prisma client, holding rows per model. */
function fakeDb(rows: Partial<Record<string, Record<string, unknown>[]>>) {
  const created: Record<string, Record<string, unknown>[]> = {}
  const executed: string[] = []
  const db = Object.fromEntries(
    BACKUP_MODELS.map((model) => [
      model,
      {
        findMany: async () => rows[model] ?? [],
        count: async () => (rows[model] ?? []).length,
        createMany: async ({ data }: { data: Record<string, unknown>[] }) => {
          created[model] = [...(created[model] ?? []), ...data]
          return { count: data.length }
        },
      },
    ]),
  )
  return {
    db: {
      ...db,
      $executeRaw: async (strings: TemplateStringsArray) => {
        executed.push(strings.join('?'))
        return 1
      },
    } as any,
    created,
    executed,
  }
}

/** A stand-in for the S3 client, holding objects by key. */
function fakeS3(keys: string[]) {
  const objects = new Map<string, Uint8Array>(
    keys.map((key) => [key, new Uint8Array()]),
  )
  const commands: unknown[] = []
  const s3 = {
    send: async (command: unknown) => {
      commands.push(command)
      if (command instanceof PutObjectCommand) {
        objects.set(command.input.Key!, command.input.Body as Uint8Array)
        return {}
      }
      if (command instanceof DeleteObjectCommand) {
        objects.delete(command.input.Key!)
        return {}
      }
      if (command instanceof ListObjectsV2Command) {
        // Two pages, to exercise the continuation token.
        const all = Array.from(objects.keys()).filter((key) =>
          key.startsWith(command.input.Prefix ?? ''),
        )
        const start = command.input.ContinuationToken ? 2 : 0
        const page = command.input.ContinuationToken
          ? all.slice(2)
          : all.slice(0, 2)
        return {
          Contents: page.map((Key) => ({ Key, Size: 1 })),
          IsTruncated: start === 0 && all.length > 2,
          NextContinuationToken: 'next',
        }
      }
      throw new Error('Unexpected command')
    },
  }
  return { s3: s3 as any, objects, commands }
}

describe('buildBackup', () => {
  it('reads every model', async () => {
    const { db } = fakeDb({ group: [{ id: 'g1' }], participant: [{ id: 'p' }] })
    const backup = await buildBackup(db, new Date('2026-01-31T02:00:00Z'))
    expect(backup.format).toBe(BACKUP_FORMAT)
    expect(backup.exportedAt).toBe('2026-01-31T02:00:00.000Z')
    expect(Object.keys(backup.tables)).toEqual([...BACKUP_MODELS])
    expect(backup.tables.group).toEqual([{ id: 'g1' }])
    expect(backup.tables.expense).toEqual([])
  })
})

describe('storeBackup', () => {
  it('writes a private gzipped dump and prunes old backups', async () => {
    const { db } = fakeDb({ group: [{ id: 'g1' }] })
    const old = Array.from(
      { length: 31 },
      (_, i) => `2026-01-${String(i + 1).padStart(2, '0')}`,
    ).map((date) => `backups/${backupFileName(date)}`)
    const { s3, objects, commands } = fakeS3([
      ...old,
      'backups/unrelated.txt',
      'elsewhere/spliit-backup-2025-01-01.json.gz',
    ])

    const result = await storeBackup(
      db,
      s3,
      storage,
      new Date('2026-02-01T02:00:00Z'),
    )

    const key = 'backups/spliit-backup-2026-02-01.json.gz'
    expect(result.key).toBe(key)
    const put = commands.find((c) => c instanceof PutObjectCommand) as
      PutObjectCommand | undefined
    expect(put?.input.Bucket).toBe('spliit-backups')
    expect(put?.input.ACL).toBeUndefined()
    const stored = JSON.parse(
      gunzipSync(objects.get(key)!).toString('utf8'),
    ) as Backup
    expect(stored.tables.group).toEqual([{ id: 'g1' }])

    // 32 dated backups: the 30 newest (2026-01-03 to 2026-02-01) and the
    // first of January are kept, so only 2026-01-02 goes.
    expect(result.deleted).toEqual(['backups/spliit-backup-2026-01-02.json.gz'])
    expect(result.kept).toBe(31)
    expect(objects.has('backups/spliit-backup-2026-01-01.json.gz')).toBe(true)
    expect(objects.has('backups/unrelated.txt')).toBe(true)
    expect(objects.has('elsewhere/spliit-backup-2025-01-01.json.gz')).toBe(true)
  })
})

describe('restoreBackup', () => {
  const backup: Backup = {
    format: BACKUP_FORMAT,
    exportedAt: '2026-01-31T02:00:00.000Z',
    tables: {
      category: [{ id: 0, grouping: 'Uncategorized', name: 'General' }],
      group: [{ id: 'g1', name: 'Trip' }],
      participant: [{ id: 'p1', name: 'Ann', groupId: 'g1' }],
      expense: [],
      expenseDocument: [],
      expensePaidFor: [],
      recurringExpenseLink: [],
      activity: [],
    },
  }

  it('inserts every table into an empty database', async () => {
    const { db, created, executed } = fakeDb({})
    const rows = await restoreBackup(db, backup)
    expect(rows.group).toBe(1)
    expect(rows.expense).toBe(0)
    expect(created.group).toEqual(backup.tables.group)
    expect(created.participant).toEqual(backup.tables.participant)
    expect(executed[0]).toMatch(/setval/)
  })

  it('refuses a database that has groups', async () => {
    const { db, created } = fakeDb({ group: [{ id: 'live' }] })
    await expect(restoreBackup(db, backup)).rejects.toThrow(/empty database/)
    expect(created).toEqual({})
  })
})
