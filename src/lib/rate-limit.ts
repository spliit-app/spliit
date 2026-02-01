// Simple in-memory rate limiter
// 
// IMPORTANT: This rate limiter uses in-memory storage and will not work correctly
// in multi-instance deployments (e.g., multiple Next.js instances behind a load balancer).
// Each instance maintains its own rate limit state, effectively multiplying the allowed
// request rate by the number of instances. For production multi-instance deployments,
// consider using a distributed rate limiting solution with Redis or similar.
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10 // 10 requests per minute

export function rateLimit(identifier: string): { success: boolean; remaining: number } {
  const now = Date.now()
  const record = rateLimitStore.get(identifier)

  // Clean up old entries periodically
  if (Math.random() < 0.01) {
    for (const [key, value] of Array.from(rateLimitStore.entries())) {
      if (value.resetAt < now) {
        rateLimitStore.delete(key)
      }
    }
  }

  if (!record || record.resetAt < now) {
    // Create new record
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW,
    })
    return { success: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 }
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { success: false, remaining: 0 }
  }

  record.count++
  return { success: true, remaining: RATE_LIMIT_MAX_REQUESTS - record.count }
}

export function getRateLimitIdentifier(request: Request): string {
  // Use IP address or a combination of IP and user agent
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 
             request.headers.get('x-real-ip') ?? 
             'unknown'
  return ip
}
