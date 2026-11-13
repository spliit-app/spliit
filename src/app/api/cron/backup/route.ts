import { resolveBackupStorage } from '@/lib/backup-format'
import { buildBackup, createBackupS3Client, storeBackup } from '@/lib/backups'
import { isValidCronAuthorization } from '@/lib/cron'
import { env } from '@/lib/env'
import { prisma } from '@/lib/prisma'

// Backs up the whole database to the BACKUP_S3_BUCKET bucket as a gzipped JSON
// file, keeping 30 daily and 12 monthly copies. Meant to be called daily:
//   curl -H "Authorization: Bearer $CRON_SECRET" <base URL>/api/cron/backup
// With `?download=1` it returns the dump instead, whether or not a bucket is
// configured:
//   curl -H "Authorization: Bearer $CRON_SECRET" -o backup.json "<base URL>/api/cron/backup?download=1"
export async function GET(request: Request) {
  if (!env.CRON_SECRET) return new Response(null, { status: 404 })
  const authorization = request.headers.get('authorization')
  if (!isValidCronAuthorization(authorization, env.CRON_SECRET))
    return new Response(null, { status: 401 })

  if (new URL(request.url).searchParams.get('download') === '1') {
    const backup = await buildBackup(prisma)
    return Response.json(backup, {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Disposition': `attachment; filename="spliit-backup-${backup.exportedAt.slice(0, 10)}.json"`,
      },
    })
  }

  // Not configured is not an error: vercel.json schedules this route on every
  // Vercel deployment, and most will never set a backup bucket.
  const { storage } = resolveBackupStorage(env)
  if (!storage)
    return Response.json(
      {
        skipped: true,
        reason:
          'Backups are not configured: set BACKUP_S3_BUCKET (see the README). Use ?download=1 to download a backup instead.',
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )

  try {
    const result = await storeBackup(
      prisma,
      createBackupS3Client(storage),
      storage,
    )
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Backup failed', error)
    return Response.json(
      { error: 'Backup failed, see the server logs' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
