# Testing

## Jest Unit Tests

```bash
npm test                          # Run all tests
npm test -- --watch               # Watch mode
npm test -- path/to/file.test.ts  # Specific file
```

Tests in `src/**/*.test.ts` alongside implementation.

### Test Data Factory Pattern

```typescript
// src/lib/balances.test.ts
const makeExpense = (overrides: Partial<BalancesExpense>): BalancesExpense =>
  ({
    id: 'e1',
    expenseDate: new Date('2025-01-01T00:00:00.000Z'),
    title: 'Dinner',
    amount: 0,
    isReimbursement: false,
    splitMode: 'EVENLY',
    paidBy: { id: 'p0', name: 'P0' },
    paidFor: [{ participant: { id: 'p0', name: 'P0' }, shares: 1 }],
    ...overrides,
  }) as BalancesExpense

// Usage
const expenses = [
  makeExpense({
    amount: 100,
    paidBy: { id: 'p0', name: 'P0' },
    paidFor: [
      { participant: { id: 'p0', name: 'P0' }, shares: 1 },
      { participant: { id: 'p1', name: 'P1' }, shares: 1 },
    ],
  }),
]
```

### Focus Areas

- `balances.test.ts` - Balance calculations, split modes, edge cases
- `totals.test.ts` - Expense totals, user shares
- `currency.test.ts` - Currency formatting

## Playwright E2E Tests

```bash
npm run test-e2e  # Runs against local dev server
```

Tests in `tests/e2e/*.spec.ts` and `tests/*.spec.ts`.

### Test Helpers (`tests/helpers/`)

| Helper                                          | Purpose                  |
| ----------------------------------------------- | ------------------------ |
| `createGroupViaAPI(page, name, participants)`   | Fast group setup via API |
| `createExpense(page, { title, amount, payer })` | Fill expense form        |
| `navigateToExpenseCreate(page, groupId)`        | Go to expense creation   |
| `fillParticipants(page, names)`                 | Add participants to form |
| `selectComboboxOption(page, label, value)`      | Select dropdown value    |

### Stability Patterns

```typescript
// Wait after navigation
await page.goto(`/groups/${groupId}`)
await page.waitForLoadState()

// Wait for URL after form submission
await page.getByRole('button', { name: 'Create' }).click()
await page.waitForURL(/\/groups\/[^/]+\/expenses/)

// Use API for fast setup
const groupId = await createGroupViaAPI(page, 'Test Group', ['Alice', 'Bob'])
```

### Example Test

```typescript
import { createExpense } from '../helpers'
import { createGroupViaAPI } from '../helpers/batch-api'

test('creates expense with correct values', async ({ page }) => {
  const groupId = await createGroupViaAPI(page, `Test ${randomId(4)}`, [
    'Alice',
    'Bob',
  ])
  await page.goto(`/groups/${groupId}/expenses`)

  await createExpense(page, {
    title: 'Dinner',
    amount: '150.00',
    payer: 'Alice',
  })

  await expect(page.getByText('Dinner')).toBeVisible()
  await expect(page.getByText('$150.00')).toBeVisible()
})
```

### Config Notes

- `fullyParallel: false` in playwright.config.ts prevents DB conflicts
- Runs Chromium, Firefox, WebKit
- `json` reporter when `CLAUDE_CODE` env var detected
