# Repository Guidelines

## Project Structure & Module Organization
- `src/app`: Next.js App Router routes and pages.
- `src/components` (`ui/`): Reusable React components.
- `src/lib`: Utilities, schemas, env/prisma setup.
- `src/trpc` (`routers/`): tRPC server/client code.
- `prisma`: Prisma schema and migrations.
- `messages`: i18n locale JSON files.
- `public`: Static assets (icons, images, manifest).
- `scripts`: Dev helpers (DB, container, build).

## Build, Test, and Development Commands
- `npm run dev`: Start dev server at `http://localhost:3000`.
- `npm run build`: Production build (Next.js).
- `npm start`: Start production server.
- `npm run lint`: Run ESLint (Next core-web-vitals).
- `npm run check-types`: Type-check with TypeScript.
- `npm run prettier` / `npm run check-formatting`: Format or verify with Prettier.
- `npm test`: Run Jest tests (jsdom).
- `./scripts/start-local-db.sh`: Launch local Postgres via Docker.
- `npm run build-image` / `npm run start-container`: Build image and run with Compose.

## Coding Style & Naming Conventions
- Language: TypeScript + React; Tailwind for styles.
- Prettier: no semicolons, single quotes, organized imports.
- ESLint: `next/core-web-vitals`. Indentation: 2 spaces.
- Components: PascalCase (`src/components/Button.tsx`).
- Utilities: camelCase in `src/lib` (`formatCurrency.ts`).
- Routes: `src/app/<route>/page.tsx`; colocate server/client helpers nearby when sensible.
- tRPC: one router per domain in `src/trpc/routers`.

## Testing Guidelines
- Frameworks: Jest + Testing Library; environment `jsdom`.
- Location: colocate as `*.test.ts(x)` (e.g., `src/lib/utils.test.ts`).
- Scope: favor small, deterministic tests; mock network/DB.
- Run: `npm test` (add focused tests with `it.only` during development; remove before commit).

## Commit & Pull Request Guidelines
- Commits: imperative mood, concise subject; reference issues `#123` when relevant.
- Schema changes: include Prisma migration files and regenerate client.
  - Example: `npx prisma migrate dev -n add-recurring-expense`.
- PRs: clear description, linked issues, screenshots for UI, steps to verify, and notes on migrations/env changes.

## Security & Configuration Tips
- Never commit secrets. Copy `.env.example` → `.env` (or `container.env.example` → `container.env`).
- Feature flags: enable optional features via env (e.g., `NEXT_PUBLIC_ENABLE_EXPENSE_DOCUMENTS`).
