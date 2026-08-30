import path from 'node:path'
import { defineConfig } from 'prisma/config'

try {
  require('dotenv').config()
} catch {}

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
  },
  datasource: {
    url: process.env.DATABASE_URL || 'file:./spliit.db',
  },
})
