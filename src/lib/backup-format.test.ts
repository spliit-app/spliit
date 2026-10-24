import { gzipSync } from 'node:zlib'
import {
  BACKUP_FORMAT,
  backupDateOfKey,
  backupFileName,
  backupsToDelete,
  parseBackup,
  resolveBackupStorage,
} from './backup-format'

function days(from: string, count: number): string[] {
  const start = new Date(`${from}T00:00:00.000Z`)
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(start)
    date.setUTCDate(date.getUTCDate() - i)
    return date.toISOString().slice(0, 10)
  })
}

describe('backupsToDelete', () => {
  it('keeps everything while there are 30 days or fewer', () => {
    expect(backupsToDelete(days('2026-10-24', 30))).toEqual([])
    expect(backupsToDelete([])).toEqual([])
  })

  it('keeps 30 days plus the first backup of each of the last 12 months', () => {
    const all = days('2026-10-24', 500)
    const removed = new Set(backupsToDelete(all))
    const kept = all.filter((date) => !removed.has(date))
    // The 30 newest, plus the 1st of each month from 2025-11 to 2026-09:
    // October's first is within the 30 days, and November 2025 is month 12.
    expect(kept).toHaveLength(30 + 11)
    expect(kept).toContain('2026-09-01')
    expect(kept).toContain('2025-11-01')
    expect(kept).not.toContain('2025-10-01')
    expect(kept).not.toContain('2026-09-02')
  })

  it('keeps the earliest backup of a month when the 1st is missing', () => {
    const dates = [...days('2026-10-24', 30), '2026-08-15', '2026-08-20']
    expect(backupsToDelete(dates)).toEqual(['2026-08-20'])
  })

  it('ignores repeated dates and input order', () => {
    const dates = days('2026-10-24', 40)
    expect(backupsToDelete([...dates].reverse().concat(dates))).toEqual(
      backupsToDelete(dates),
    )
  })
})

describe('backupDateOfKey', () => {
  it('reads the date of a backup under the prefix', () => {
    expect(
      backupDateOfKey(`backups/${backupFileName('2026-01-31')}`, 'backups/'),
    ).toBe('2026-01-31')
    expect(backupDateOfKey(backupFileName('2026-01-31'), '')).toBe('2026-01-31')
  })

  it('ignores other objects', () => {
    expect(backupDateOfKey('backups/notes.txt', 'backups/')).toBeNull()
    expect(
      backupDateOfKey('other/spliit-backup-2026-01-31.json.gz', 'backups/'),
    ).toBeNull()
    expect(
      backupDateOfKey(
        'backups/nested/spliit-backup-2026-01-31.json.gz',
        'backups/',
      ),
    ).toBeNull()
  })
})

describe('resolveBackupStorage', () => {
  const upload = {
    S3_UPLOAD_KEY: 'upload-key',
    S3_UPLOAD_SECRET: 'upload-secret',
    S3_UPLOAD_REGION: 'eu-north-1',
    S3_UPLOAD_ENDPOINT: 'https://minio.example.com',
    S3_UPLOAD_BUCKET: 'documents',
  }

  it('is disabled without BACKUP_S3_BUCKET, even with S3_UPLOAD_BUCKET', () => {
    expect(resolveBackupStorage(upload)).toEqual({
      storage: null,
      missing: [],
    })
    expect(resolveBackupStorage({ BACKUP_S3_BUCKET: '  ' }).storage).toBeNull()
  })

  it('falls back to the S3_UPLOAD_* credentials', () => {
    expect(
      resolveBackupStorage({ ...upload, BACKUP_S3_BUCKET: 'backups' }).storage,
    ).toEqual({
      bucket: 'backups',
      prefix: 'backups/',
      accessKeyId: 'upload-key',
      secretAccessKey: 'upload-secret',
      region: 'eu-north-1',
      endpoint: 'https://minio.example.com',
    })
  })

  it('prefers the BACKUP_S3_* variables', () => {
    expect(
      resolveBackupStorage({
        ...upload,
        BACKUP_S3_BUCKET: 'backups',
        BACKUP_S3_KEY: 'k',
        BACKUP_S3_SECRET: 's',
        BACKUP_S3_REGION: 'auto',
        BACKUP_S3_ENDPOINT: 'https://r2.example.com',
        BACKUP_S3_PREFIX: '/spliit/daily',
      }).storage,
    ).toEqual({
      bucket: 'backups',
      prefix: 'spliit/daily/',
      accessKeyId: 'k',
      secretAccessKey: 's',
      region: 'auto',
      endpoint: 'https://r2.example.com',
    })
  })

  it('lists the missing credentials', () => {
    expect(
      resolveBackupStorage({ BACKUP_S3_BUCKET: 'b', BACKUP_S3_KEY: 'k' }),
    ).toEqual({
      storage: null,
      missing: ['BACKUP_S3_SECRET', 'BACKUP_S3_REGION'],
    })
  })
})

describe('parseBackup', () => {
  const backup = {
    format: BACKUP_FORMAT,
    exportedAt: '2026-01-31T02:00:00.000Z',
    tables: { group: [{ id: 'g1', name: 'Trip' }] },
  }

  it('reads plain and gzipped JSON', () => {
    const json = Buffer.from(JSON.stringify(backup))
    expect(parseBackup(json)).toEqual(backup)
    expect(parseBackup(gzipSync(json))).toEqual(backup)
  })

  it('rejects another format', () => {
    expect(() =>
      parseBackup(Buffer.from(JSON.stringify({ ...backup, format: 'x' }))),
    ).toThrow(/Unknown backup format/)
    expect(() => parseBackup(Buffer.from('null'))).toThrow(
      /Unknown backup format/,
    )
  })

  it('rejects malformed tables', () => {
    expect(() =>
      parseBackup(
        Buffer.from(JSON.stringify({ ...backup, tables: { group: {} } })),
      ),
    ).toThrow(/"group"/)
  })
})
