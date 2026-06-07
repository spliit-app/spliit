import { prisma } from '@/lib/prisma'

export interface HealthCheckStatus {
  status: 'healthy' | 'unhealthy'
  services?: {
    database?: {
      status: 'healthy' | 'unhealthy'
      error?: string
    }
  }
}

async function checkDatabase(): Promise<{
  status: 'healthy' | 'unhealthy'
  error?: string
}> {
  try {
    // Simple query to test database connectivity
    await prisma.$queryRaw`SELECT 1`
    return {
      status: 'healthy',
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error:
        error instanceof Error ? error.message : 'Database connection failed',
    }
  }
}

function createHealthResponse(
  data: HealthCheckStatus,
  isHealthy: boolean,
): Response {
  return new Response(JSON.stringify(data), {
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Content-Type': 'application/json',
    },
  })
}

export async function checkReadiness(): Promise<Response> {
  try {
    const databaseStatus = await checkDatabase()

    const services: HealthCheckStatus['services'] = {
      database: databaseStatus,
    }

    // For readiness: healthy only if all services are healthy
    const isHealthy = databaseStatus.status === 'healthy'

    const healthStatus: HealthCheckStatus = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      services,
    }

    return createHealthResponse(healthStatus, isHealthy)
  } catch (error) {
    const errorStatus: HealthCheckStatus = {
      status: 'unhealthy',
      services: {
        database: {
          status: 'unhealthy',
          error:
            error instanceof Error ? error.message : 'Readiness check failed',
        },
      },
    }

    return createHealthResponse(errorStatus, false)
  }
}

export async function checkLiveness(): Promise<Response> {
  try {
    // Liveness: Only check if the app process is alive
    // No database or external service checks - restarting won't fix those
    const healthStatus: HealthCheckStatus = {
      status: 'healthy',
      // No services reported - we don't check them for liveness
    }

    return createHealthResponse(healthStatus, true) // Always 200 for liveness
  } catch (error) {
    // This should rarely happen, but if it does, the app needs restart
    const errorStatus: HealthCheckStatus = {
      status: 'unhealthy',
    }

    return createHealthResponse(errorStatus, false)
  }
}
