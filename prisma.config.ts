import path from 'node:path'
import { defineConfig } from 'prisma/config'

// Prisma 7 no longer reads `.env` automatically. Load it when available so the
// Prisma CLI (generate, migrate) picks up local credentials. In production
// (Docker / Next.js) the variables are already present in the environment, and
// a missing `.env` file or `dotenv` package is harmless.
try {
  require('dotenv').config()
} catch {}

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
  },
  datasource: {
    // Migrate / introspection use a direct (non-pooled) connection. Fall back to
    // the pooled URL when a dedicated direct URL is not configured.
    url:
      process.env.POSTGRES_URL_NON_POOLING ??
      process.env.POSTGRES_PRISMA_URL ??
      '',
  },
})
