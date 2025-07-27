import { prisma } from '@/lib/prisma'

interface HealthCheckStatus {
  status: 'healthy' | 'unhealthy'
  services: {
    database: {
      status: 'healthy' | 'unhealthy'
      error?: string
    }
  }
}

async function checkDatabase(): Promise<HealthCheckStatus['services']['database']> {
  try {
    // Simple query to test database connectivity
    await prisma.$queryRaw`SELECT 1`
    return {
      status: 'healthy'
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Database connection failed'
    }
  }
}

export async function GET() {
  try {
    const databaseStatus = await checkDatabase()

    const services: HealthCheckStatus['services'] = {
      database: databaseStatus
    }

    // Determine overall health status
    const isHealthy = databaseStatus.status === 'healthy'

    const healthStatus: HealthCheckStatus = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      services
    }

    return new Response(JSON.stringify(healthStatus), {
      status: isHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    })
  } catch (error) {
    const errorStatus: HealthCheckStatus = {
      status: 'unhealthy',
      services: {
        database: {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Health check failed'
        }
      }
    }

    return new Response(JSON.stringify(errorStatus), {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    })
  }
} 
