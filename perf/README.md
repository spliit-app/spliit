# Performance suite

Benchmarks the three most-used flows in the app over HTTP, against a real
Postgres with a realistic amount of data in it.

The point is to make performance work measurable: to tell whether a change to a
query, an index, or a procedure actually helped, and to catch it when something
gets quietly worse.

## Running it

```sh
npm run perf
```

That builds an image from the checkout, starts it with a throwaway Postgres,
seeds the dataset, benchmarks, prints a report, and tears everything down.

While iterating, keep the stack up between runs:

```sh
npm run perf:up      # build and start
npm run perf:seed    # (re)seed
npm run perf:bench   # benchmark; repeat as often as you like
npm run perf:bench -- --filter view-group
npm run perf:down
```

Sizing and sampling come from environment variables — see `config.ts` for the
full list and defaults:

```sh
PERF_LARGE_GROUP_EXPENSES=10000 PERF_ITERATIONS=50 npm run perf
```

## What it measures

| Scenario                 | Screen                            | Procedures                                               |
| ------------------------ | --------------------------------- | -------------------------------------------------------- |
| `list-groups:home`       | `/groups`                         | `groups.list` + `groups.balances.forUser`                |
| `view-group:first-page`  | `/groups/[id]/expenses`           | `groups.get` + `groups.expenses.list`                    |
| `view-group:deep-page`   | scrolled halfway down that list   | `groups.expenses.list` at a deep offset                  |
| `view-group:search`      | the search box on that list       | `groups.expenses.list` with a filter                     |
| `view-group:balances`    | the Balances tab                  | `groups.balances.list`                                   |
| `view-expense:edit-form` | `/groups/[id]/expenses/[id]/edit` | `groups.get` + `categories.list` + `groups.expenses.get` |

Each mirrors what the client genuinely issues — same procedures, same page size,
same batching — so a number here corresponds to a real screen rather than to a
query someone thought the screen ran.

## Reading the report

```
step                          p50        p95       cold     db ms   queries      bytes    rows
list-groups:home           241.3ms    268.9ms    502.1ms   198.4ms     61/61  31204/24000     40
```

- **p50 / p95 / cold** — wall-clock, client-side. Informational only.
- **db ms** — server-side database time, from `Server-Timing`. Informational.
- **queries / bytes** — actual against budget.
- **rows** — how many rows came back.

## What can fail the build

Only the deterministic columns: request count, response bytes, row count and
server-side query count. Against a fixed dataset these are exactly reproducible,
so they can gate a pull request without flaking.

Wall-clock timings are **never** asserted. On a shared CI runner they vary
enough between jobs that any threshold tight enough to catch a real regression
would also fire on noise. They are recorded, printed, and charted over releases,
and they are for humans to look at.

When a budget fails, the run prints what exceeded what. If the change was
intentional, update `budgets.ts` with the figures from the report.

Budgets are written as formulas over `config` rather than as bare numbers, so a
resized dataset keeps working — and so the cost model is stated out loud.
`1 + config.groups * 3` says the home screen does three queries per recent
group, and a diff that turns it into `1 + config.groups` is a visible
improvement rather than a number that silently moved.

## Query counting

`queries` comes from an optional `X-Perf-Db-Queries` response header. When the
app under test does not send it the column reads `-` and any query budget is
skipped rather than failed, so the suite works against any deployment.

It counts **Prisma operations**, not raw SQL statements: one `findMany` with an
`include` may issue several statements but counts once. That is still exactly
reproducible, and it is the right granularity for what the counter is for —
noticing that a procedure now runs N queries where it used to run a constant
number.

## Caveats

The benchmark Postgres runs with `fsync=off`, `synchronous_commit=off` and
`full_page_writes=off`, and CI runners vary. **These timings are for comparing
runs against each other, not for estimating production capacity.** The timing
series is meaningful as a trend across many releases; two adjacent points are
not meaningfully comparable.

## Determinism

The seeder is the reason any of this works. It uses a fixed PRNG seed and fixed
timestamps, and two properties matter enough to call out:

- Every expense has a unique `createdAt`, so the list's
  `[{expenseDate: desc}, {createdAt: desc}]` sort is a total order. Without
  that, tied rows could come back in either order and the byte counts would
  flap.
- Nothing recurs. `getGroupExpenses` calls `createRecurringExpenses()` on every
  read, which _writes_ when a frame is due — during a benchmark that would move
  both row and query counts between iterations. Every seeded expense is
  `RecurrenceRule.NONE`, so that pass stays a single constant-cost query.

The harness also checks this at runtime: if a supposedly deterministic value
changes between iterations of the same step, the run fails rather than averaging
it away.
