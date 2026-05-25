import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

declare const global: Global & { prisma?: PrismaClient }

export let p: PrismaClient = undefined as any as PrismaClient

if (typeof window === 'undefined') {
  const adapter = new PrismaPg({
    connectionString:
      process.env.POSTGRES_PRISMA_URL ??
      process.env.POSTGRES_URL_NON_POOLING ??
      'postgresql://localhost:5432/spliit',
  })

  // await delay(1000)
  if (process.env['NODE_ENV'] === 'production') {
    p = new PrismaClient({ adapter })
  } else {
    if (!global.prisma) {
      global.prisma = new PrismaClient({
        adapter,
        // log: [{ emit: 'stdout', level: 'query' }],
      })
    }
    p = global.prisma
  }
}

export const prisma = p
