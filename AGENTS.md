# AGENTS.md

Spliit is an open-source expense-splitting app (Next.js + tRPC + Prisma + PostgreSQL).

## Commands

```bash
npm run dev          # Dev server at localhost:3000
npm run build        # Production build
npm check-types      # TypeScript check (not `npm run tsc`)
npm check-formatting # Prettier check
npm test             # Jest unit tests
npm run test-e2e     # Playwright e2e tests
```

## Directory Structure

- `src/app/` - Next.js App Router pages, layouts, Server Actions
- `src/components/` - React components (shadcn/UI based)
- `src/trpc/routers/` - tRPC procedures organized by domain
- `src/lib/` - Utilities (balances, totals, currency, schemas)
- `prisma/schema.prisma` - Database schema

## Key Patterns

**Data**

- Amounts stored as integers (cents). 100 = $1.00
- `BY_PERCENTAGE` splits use basis points (2500 = 25%)

**Frontend**

- Next.js App Router, Server Components default
- shadcn/UI components in `src/components/ui/`
- Forms: React Hook Form + Zod + shadcn `<Form>`
- tRPC hooks via `trpc.domain.procedure.useQuery/useMutation()`

**Backend**

- tRPC procedures in `src/trpc/routers/`, one file per operation
- Zod for input validation on all procedures
- Business logic in `src/lib/api.ts`, procedures are thin wrappers

**Database**

- Prisma ORM, schema at `prisma/schema.prisma`
- Queries use `include` for relations, not separate fetches

## Detailed Docs

- [Architecture](.agent/architecture.md) - Data model, tRPC structure, directory details
- [Database](.agent/database.md) - Prisma patterns, migrations, queries
- [Testing](.agent/testing.md) - Jest/Playwright patterns, helpers, factories
- [tRPC Procedures](.agent/trpc-procedures.md) - Adding new procedures, router composition
