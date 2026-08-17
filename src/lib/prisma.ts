import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// Prisma 7 ships a Rust-free client and requires an explicit driver adapter.
// We use the `pg` adapter with the pooled connection string.
function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env['POSTGRES_PRISMA_URL'],
  })
  return new PrismaClient({
    adapter,
    // log: [{ emit: 'stdout', level: 'query' }],
  })
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
