import { checkReadiness } from '@/lib/health'

// Readiness: Can the app serve requests? (includes all external dependencies)
// If this fails, Kubernetes should stop sending traffic but not restart
export async function GET() {
  return checkReadiness()
}
