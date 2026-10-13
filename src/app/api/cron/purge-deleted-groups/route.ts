import { isValidCronAuthorization } from '@/lib/cron'
import { env } from '@/lib/env'
import { purgeScheduledGroups } from '@/lib/group-deletion'

// Permanently deletes the groups whose deletion grace period has ended. Meant
// to be called on a schedule, e.g. daily:
//   curl -H "Authorization: Bearer $CRON_SECRET" <base URL>/api/cron/purge-deleted-groups
export async function GET(request: Request) {
  if (!env.CRON_SECRET) return new Response(null, { status: 404 })
  const authorization = request.headers.get('authorization')
  if (!isValidCronAuthorization(authorization, env.CRON_SECRET))
    return new Response(null, { status: 401 })

  const result = await purgeScheduledGroups()
  return Response.json(result, {
    status: result.failedGroupIds.length > 0 ? 500 : 200,
    headers: { 'Cache-Control': 'no-store' },
  })
}
