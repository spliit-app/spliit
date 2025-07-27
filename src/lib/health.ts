import { prisma } from '@/lib/prisma'

export interface HealthCheckStatus {
  status: 'healthy' | 'unhealthy'
  services: {
    database: {
      status: 'healthy' | 'unhealthy'
      error?: string
    }
  }
}

async function checkDatabase(): Promise<
  HealthCheckStatus['services']['database']
> {
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

async function performHealthCheck(isLiveness: boolean): Promise<Response> {
  try {
    const databaseStatus = await checkDatabase()

    const services: HealthCheckStatus['services'] = {
      database: databaseStatus,
    }

    // For liveness: always healthy if app responds (ignore DB status for HTTP code)
    // For readiness: healthy only if all services are healthy
    const isHealthy = isLiveness ? true : databaseStatus.status === 'healthy'
    const status = isHealthy ? 'healthy' : 'unhealthy'

    const healthStatus: HealthCheckStatus = {
      status,
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
            error instanceof Error
              ? error.message
              : `${isLiveness ? 'Liveness' : 'Readiness'} check failed`,
        },
      },
    }

    return createHealthResponse(errorStatus, false)
  }
}

export async function checkReadiness(): Promise<Response> {
  return performHealthCheck(false)
}

export async function checkLiveness(): Promise<Response> {
  return performHealthCheck(true)
}
