# Database

## Setup

```bash
./scripts/start-local-db.sh  # Start PostgreSQL container
npx prisma migrate dev       # Run migrations
npx prisma studio            # GUI for database
npx prisma generate          # Regenerate client after schema changes
```

## Prisma Client Singleton

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

Dev mode uses global singleton to survive hot reload.

## Schema Changes

1. Edit `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name descriptive_name`
3. Commit migration file + schema changes together

## Query Patterns

### Create with Relations

```typescript
// src/lib/api.ts - createExpense
await prisma.expense.create({
  data: {
    groupId,
    title,
    amount,
    paidById: paidBy,
    splitMode,
    expenseDate,
    paidFor: {
      createMany: {
        data: paidFor.map(({ participant, shares }) => ({
          participantId: participant,
          shares,
        })),
      },
    },
  },
})
```

### Query with Includes

```typescript
// Expenses with payer and split details
await prisma.expense.findMany({
  where: { groupId },
  include: {
    paidBy: true,
    paidFor: { include: { participant: true } },
    category: true,
  },
  orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
})
```

### Update with Nested Operations

```typescript
// Update expense and replace paidFor entries
await prisma.expense.update({
  where: { id: expenseId },
  data: {
    title,
    amount,
    paidFor: {
      deleteMany: {}, // Remove all existing
      createMany: { data: newPaidFor },
    },
  },
})
```

## Transactions

Used for atomic operations:

```typescript
// src/lib/api.ts - createRecurringExpenses
await prisma.$transaction(async (tx) => {
  const expense = await tx.expense.create({ data: expenseData })
  await tx.recurringExpenseLink.update({
    where: { id: linkId },
    data: { nextExpenseCreatedAt: nextDate },
  })
  return expense
})
```

## Amount Storage

All monetary values stored as **integers in cents**:

- `100` = $1.00
- `15050` = $150.50

Split shares vary by mode:

- `EVENLY`: 1 per participant
- `BY_SHARES`: Weight integers (1, 2, 3...)
- `BY_PERCENTAGE`: Basis points (2500 = 25%)
- `BY_AMOUNT`: Cents directly
