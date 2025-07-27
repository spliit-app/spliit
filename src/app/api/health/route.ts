import { checkReadiness } from '@/lib/health'

// Default health check - same as readiness (includes database check)
// This is readiness-focused for monitoring tools like uptime-kuma
export async function GET() {
  return checkReadiness()
}
