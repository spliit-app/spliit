import { PrismaClient } from '@prisma/client'

let prisma: PrismaClient

export async function getPrisma() {
  // await delay(1000)
  if (!prisma) {
    if (process.env.NODE_ENV === 'production') {
      prisma = new PrismaClient()
    } else {
      if (!(global as any).prisma) {
        ;(global as any).prisma = new PrismaClient()
      }
      prisma = (global as any).prisma
    }
  }
  return prisma
}
