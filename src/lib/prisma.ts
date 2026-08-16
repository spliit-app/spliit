import { PrismaClient } from '@prisma/client'

// `types: ["node", "jest"]` narrows the ambient globals, so the old
// `declare const global: Global` is no longer available. `globalThis` is the
// portable spelling and needs no ambient declaration.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export let p: PrismaClient = undefined as any as PrismaClient

if (typeof window === 'undefined') {
  // await delay(1000)
  if (process.env['NODE_ENV'] === 'production') {
    p = new PrismaClient()
  } else {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = new PrismaClient({
        // log: [{ emit: 'stdout', level: 'query' }],
      })
    }
    p = globalForPrisma.prisma
  }
}

export const prisma = p
