import { PrismaClient } from '@prisma/client'

declare const global: Global & { prisma?: PrismaClient }

export let p: PrismaClient = undefined as any as PrismaClient

if (typeof window === 'undefined') {
  // await delay(1000)
  if (process.env['NODE_ENV'] === 'production') {
    p = new PrismaClient()
  } else {
    if (!global.prisma) {
      global.prisma = new PrismaClient({
        // log: [{ emit: 'stdout', level: 'query' }],
      })
    }
    p = global.prisma
  }
}

export const prisma = p
