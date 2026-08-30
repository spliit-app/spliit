import { PrismaClient } from '@/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function getDatabaseUrl(): string {
  if (process.env.NODE_ENV === 'test') {
    return 'file:./spliit.db'
  }
  return process.env.DATABASE_URL || 'file:./spliit.db'
}

function createPrismaClient() {
  const url = getDatabaseUrl()
  let filePath = url.startsWith('file:') ? url.slice(5) : url

  try {
    const dir = path.dirname(filePath)
    if (dir && dir !== '.' && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  } catch {
    filePath = './spliit.db'
  }

  const adapter = new PrismaBetterSqlite3({
    url: filePath,
  })
  return new PrismaClient({
    adapter,
  })
}

export let p: PrismaClient = undefined as any as PrismaClient

if (typeof window === 'undefined' || process.env.NODE_ENV === 'test') {
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
