import { checkLiveness } from '@/lib/health'

// Liveness: Is the app itself healthy? (no external dependencies)
// If this fails, Kubernetes should restart the pod
export async function GET() {
  return checkLiveness()
}
