/**
 * Lists or downloads the backups that /api/cron/backup stores in
 * BACKUP_S3_BUCKET, reading the same BACKUP_S3_* (or S3_UPLOAD_*) variables
 * from the environment or `.env`:
 *
 *   npm run backup:download               list them, newest first
 *   npm run backup:download -- latest     download the newest
 *   npm run backup:download -- 2026-01-31 download that day's
 *
 * Files are written to ./backups/. Restore one with `npm run backup:restore`.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { resolveBackupStorage } from '@/lib/backup-format'
import {
  createBackupS3Client,
  listBackups,
  readBackupObject,
} from '@/lib/backups'
import { config } from 'dotenv'

async function main() {
  config({ quiet: true })
  const { storage, missing } = resolveBackupStorage(process.env)
  if (!storage) {
    console.error(
      missing.length > 0
        ? `Missing ${missing.join(', ')} (or the S3_UPLOAD_* equivalent).`
        : 'BACKUP_S3_BUCKET is not set.',
    )
    process.exit(1)
  }
  const s3 = createBackupS3Client(storage)
  const backups = await listBackups(s3, storage)

  const wanted = process.argv[2]
  if (!wanted) {
    if (backups.length === 0) console.log('No backups yet.')
    for (const { key, size } of backups)
      console.log(`${key}  ${((size ?? 0) / 1024).toFixed(1)} kB`)
    return
  }

  const backup =
    wanted === 'latest' ? backups[0] : backups.find((b) => b.date === wanted)
  if (!backup) {
    console.error(`No backup for ${wanted}.`)
    process.exit(1)
  }
  const bytes = await readBackupObject(s3, storage, backup.key)
  const dir = join(process.cwd(), 'backups')
  mkdirSync(dir, { recursive: true })
  const file = join(dir, basename(backup.key))
  writeFileSync(file, bytes)
  console.log(`Wrote ${file}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
