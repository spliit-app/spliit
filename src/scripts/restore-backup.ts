/**
 * Restores a backup (a .json.gz from the bucket, or the .json returned by
 * /api/cron/backup?download=1) into an EMPTY database:
 *
 *   npx prisma migrate deploy              create the tables first
 *   npm run backup:restore -- backups/spliit-backup-2026-01-31.json.gz
 *
 * It connects with POSTGRES_URL_NON_POOLING (or POSTGRES_PRISMA_URL), from the
 * environment or `.env`, and refuses to run if the database has any group, so
 * it cannot overwrite or mix with live data. Everything is inserted in one
 * transaction: if anything fails, nothing is written.
 */
import { readFileSync } from 'node:fs'
import { PrismaClient } from '@/generated/prisma/client'
import { parseBackup } from '@/lib/backup-format'
import { restoreBackup } from '@/lib/backups'
import { PrismaPg } from '@prisma/adapter-pg'
import { config } from 'dotenv'

async function main() {
  config({ quiet: true })
  const file = process.argv[2]
  const connectionString =
    process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_PRISMA_URL
  if (!file || !connectionString) {
    console.error(
      'Usage: POSTGRES_URL_NON_POOLING=… npm run backup:restore -- <backup file>',
    )
    process.exit(1)
  }

  const backup = parseBackup(readFileSync(file))
  console.log(`Restoring the backup taken at ${backup.exportedAt}…`)

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  })
  try {
    const rows = await prisma.$transaction((tx) => restoreBackup(tx, backup), {
      maxWait: 60_000,
      timeout: 60 * 60_000,
    })
    for (const [model, count] of Object.entries(rows))
      console.log(`${model}: ${count}`)
    console.log('Done.')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
