import { timingSafeEqual } from 'node:crypto'

/**
 * Whether an Authorization header is `Bearer <secret>`, as Vercel Cron sends it
 * when CRON_SECRET is set. Compared in constant time.
 */
export function isValidCronAuthorization(
  authorization: string | null,
  secret: string,
) {
  const expected = Buffer.from(`Bearer ${secret}`)
  const actual = Buffer.from(authorization ?? '')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
