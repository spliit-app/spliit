import { PrismaClient } from '@/generated/prisma/client'
import {
  PERF_INSTRUMENTATION_ENABLED,
  recordQuery,
} from '@/lib/perf-instrumentation'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// Prisma 7 ships a Rust-free client and requires an explicit driver adapter.
// We use the `pg` adapter with the pooled connection string.
function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env['POSTGRES_PRISMA_URL'],
  })
  const client = new PrismaClient({
    adapter,
    // log: [{ emit: 'stdout', level: 'query' }],
  })

  if (!PERF_INSTRUMENTATION_ENABLED) return client

  // Counts operations into whatever `withPerfCounters` scope is active, so
  // /api/trpc can report how much database work a request did. Only reached
  // when PERF_INSTRUMENTATION=1, i.e. under compose.perf.yaml.
  //
  // `$extends` returns a structurally different (narrower) type than
  // PrismaClient, so the cast is needed to keep one type for both branches.
  // Nothing is removed by the extension -- it only wraps each operation.
  return client.$extends({
    query: {
      async $allOperations({ args, query }) {
        const start = performance.now()
        try {
          return await query(args)
        } finally {
          recordQuery(performance.now() - start)
        }
      },
    },
  }) as unknown as PrismaClient
}

export let p: PrismaClient = undefined as any as PrismaClient

if (typeof window === 'undefined') {
  if (process.env['NODE_ENV'] === 'production') {
    p = createPrismaClient()
  } else {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrismaClient()
    }
    p = globalForPrisma.prisma
  }
}

export const prisma = p
