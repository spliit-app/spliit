# Architecture

## Data Model (Prisma)

```
Group (id, name, currency, currencyCode)
  └── Participant (id, name)
  └── Expense (id, title, amount, expenseDate, splitMode, isReimbursement)
        ├── paidBy → Participant
        ├── paidFor → ExpensePaidFor[] (participantId, shares)
        ├── Category (id, grouping, name)
        ├── ExpenseDocument[] (url, width, height)
        └── RecurringExpenseLink (nextExpenseCreatedAt)
  └── Activity (time, activityType, data) - audit log
```

### Split Modes

- `EVENLY`: Divide equally, `shares` = 1 per participant
- `BY_SHARES`: Proportional, e.g., shares 2:1:1 = 50%:25%:25%
- `BY_PERCENTAGE`: Basis points (10000 = 100%), e.g., 2500 = 25%
- `BY_AMOUNT`: Direct cents, `shares` = exact amount owed

### Calculations (src/lib/balances.ts)

```typescript
// BY_PERCENTAGE: (expense.amount * shares) / 10000
// BY_SHARES: (expense.amount * shares) / totalShares
// BY_AMOUNT: shares directly
// Rounding: Math.round() at the end
```

## Directory Details

### src/app/

Next.js App Router. Pages, layouts, Server Actions. Group pages under `groups/[groupId]/`.

### src/components/

Reusable components. shadcn/UI primitives in `ui/`. Feature components at root.

### src/trpc/

- `init.ts` - tRPC config, SuperJSON transformer
- `routers/_app.ts` - Root router composition
- `routers/groups/` - Group domain (expenses, balances, stats, activities)
- `routers/categories/` - Category CRUD

### src/lib/

- `api.ts` - Database operations (createExpense, updateExpense, etc.)
- `balances.ts` - Balance calculation logic
- `totals.ts` - Expense total calculations
- `schemas.ts` - Zod validation schemas
- `prisma.ts` - Prisma client singleton
- `featureFlags.ts` - Feature toggles (S3 docs, receipt scanning)

## tRPC Router Hierarchy

```
appRouter
├── groups
│   ├── get, getDetails, list, create, update
│   ├── expenses (list, get, create, update, delete)
│   ├── balances (list)
│   ├── stats (get)
│   └── activities (list)
└── categories
    └── list
```

API calls: `trpc.groups.expenses.create()`, `trpc.groups.balances.list()`, etc.

## Feature Flags

Env vars for optional features:

- `NEXT_PUBLIC_ENABLE_EXPENSE_DOCUMENTS` - S3 image uploads
- `NEXT_PUBLIC_ENABLE_RECEIPT_EXTRACT` - GPT-4V receipt scanning
- `NEXT_PUBLIC_ENABLE_CATEGORY_EXTRACT` - AI category suggestions
