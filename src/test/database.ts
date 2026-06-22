import { prisma } from '@/lib/prisma'

let isAvailable = false
let hasWarned = false

export async function checkDatabaseAvailability() {
  try {
    await prisma.$queryRaw`SELECT 1`
    isAvailable = true
  } catch {
    isAvailable = false
  }
}

export function testRequiresDatabase() {
  if (!isAvailable) {
    if (!hasWarned) {
      console.warn(
        'Skipping database-backed tests because Postgres is unavailable',
      )
      hasWarned = true
    }
    return false
  }
  return true
}
