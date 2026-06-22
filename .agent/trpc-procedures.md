# tRPC Procedures

## Router Composition

Routers compose hierarchically via `createTRPCRouter`:

```typescript
// src/trpc/routers/_app.ts (root)
import { createTRPCRouter } from '../init'
import { categoriesRouter } from './categories'
import { groupsRouter } from './groups'

export const appRouter = createTRPCRouter({
  groups: groupsRouter,
  categories: categoriesRouter,
})
```

```typescript
// src/trpc/routers/groups/index.ts (domain)
export const groupsRouter = createTRPCRouter({
  expenses: groupExpensesRouter, // sub-router
  balances: groupBalancesRouter,
  stats: groupStatsRouter,
  activities: activitiesRouter,
  get: getGroupProcedure, // procedures
  create: createGroupProcedure,
})
```

## Adding a New Procedure

### 1. Create Procedure File

```typescript
// src/trpc/routers/groups/expenses/archive.procedure.ts
import { prisma } from '@/lib/prisma'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

export const archiveExpenseProcedure = baseProcedure
  .input(
    z.object({
      expenseId: z.string().min(1),
      groupId: z.string().min(1),
    }),
  )
  .mutation(async ({ input: { expenseId, groupId } }) => {
    const expense = await prisma.expense.update({
      where: { id: expenseId, groupId },
      data: { archived: true },
    })
    return { expenseId: expense.id }
  })
```

### 2. Export from Router Index

```typescript
// src/trpc/routers/groups/expenses/index.ts
import { archiveExpenseProcedure } from './archive.procedure'

export const groupExpensesRouter = createTRPCRouter({
  list: listGroupExpensesProcedure,
  get: getGroupExpenseProcedure,
  create: createGroupExpenseProcedure,
  update: updateGroupExpenseProcedure,
  delete: deleteGroupExpenseProcedure,
  archive: archiveExpenseProcedure, // add here
})
```

### 3. Use in Client

```typescript
// Query
const { data } = trpc.groups.expenses.list.useQuery({ groupId })

// Mutation
const archiveMutation = trpc.groups.expenses.archive.useMutation()
await archiveMutation.mutateAsync({ expenseId, groupId })
```

## Zod Validation

Input validation via `.input()`:

```typescript
// Inline schema
.input(z.object({
  groupId: z.string().min(1),
  title: z.string().min(2),
  amount: z.number().positive(),
}))

// Shared schema (src/lib/schemas.ts)
import { expenseFormSchema } from '@/lib/schemas'

.input(z.object({
  groupId: z.string(),
  expenseFormValues: expenseFormSchema,
}))
```

## Query vs Mutation

```typescript
// Query - fetching data
export const listProcedure = baseProcedure
  .input(z.object({ groupId: z.string() }))
  .query(async ({ input }) => {
    return prisma.expense.findMany({ where: { groupId: input.groupId } })
  })

// Mutation - modifying data
export const createProcedure = baseProcedure
  .input(z.object({ title: z.string() }))
  .mutation(async ({ input }) => {
    return prisma.expense.create({ data: input })
  })
```

## SuperJSON Transformer

Configured in `src/trpc/init.ts`. Automatically handles:

- `Date` serialization
- `BigInt` serialization
- `Map`/`Set` serialization

No manual conversion needed for these types.
