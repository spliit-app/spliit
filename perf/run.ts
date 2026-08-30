/**
 * Entry point: runs every scenario against a seeded, running app, prints a
 * report, writes it as JSON, and fails when a deterministic budget is exceeded.
 *
 * Usage (normally via `npm run perf`, which brings the stack up first):
 *   ts-node -T perf/run.ts [--filter <substring>] [--json <path>]
 */
import { writeFileSync } from 'node:fs'
import { type Budget, budgets } from './budgets'
import { waitForApp } from './client'
import { baseUrl, config } from './config'
import { type StepResult, runStep } from './harness'
import { listGroups } from './scenarios/list-groups'
import { viewExpense } from './scenarios/view-expense'
import { viewGroup } from './scenarios/view-group'

const steps = [...listGroups, ...viewGroup, ...viewExpense]

type Violation = {
  step: string
  metric: string
  actual: number
  budget: number
}

function checkBudget(result: StepResult, budget: Budget): Violation[] {
  const violations: Violation[] = []
  const { recording } = result

  if (recording.requests > budget.requests) {
    violations.push({
      step: result.name,
      metric: 'requests',
      actual: recording.requests,
      budget: budget.requests,
    })
  }

  if (recording.bytes > budget.bytes) {
    violations.push({
      step: result.name,
      metric: 'bytes',
      actual: recording.bytes,
      budget: budget.bytes,
    })
  }

  // Rows is an equality check, not a ceiling: fetching fewer rows than expected
  // means the scenario stopped exercising what it was written to exercise.
  if (budget.rows !== undefined && result.rows !== budget.rows) {
    violations.push({
      step: result.name,
      metric: 'rows (exact)',
      actual: result.rows,
      budget: budget.rows,
    })
  }

  // Skipped entirely when the app runs without PERF_INSTRUMENTATION.
  if (budget.dbQueries !== undefined && recording.dbQueries !== null) {
    if (recording.dbQueries > budget.dbQueries) {
      violations.push({
        step: result.name,
        metric: 'dbQueries',
        actual: recording.dbQueries,
        budget: budget.dbQueries,
      })
    }
  }

  return violations
}

const ms = (value: number) => `${value.toFixed(1)}ms`
const pad = (value: string, width: number) => value.padEnd(width)
const padStart = (value: string, width: number) => value.padStart(width)

function report(results: StepResult[]) {
  const nameWidth = Math.max(...results.map((r) => r.name.length), 4)

  console.log('')
  console.log(
    `${pad('step', nameWidth)}  ${padStart('p50', 9)}  ${padStart('p95', 9)}  ` +
      `${padStart('cold', 9)}  ${padStart('db ms', 8)}  ${padStart('queries', 8)}  ` +
      `${padStart('bytes', 9)}  ${padStart('rows', 6)}`,
  )
  console.log('-'.repeat(nameWidth + 68))

  for (const result of results) {
    const budget = budgets[result.name]
    const queries =
      result.recording.dbQueries === null
        ? '-'
        : budget?.dbQueries !== undefined
          ? `${result.recording.dbQueries}/${budget.dbQueries}`
          : String(result.recording.dbQueries)
    const bytes =
      budget !== undefined
        ? `${result.recording.bytes}/${budget.bytes}`
        : String(result.recording.bytes)

    console.log(
      `${pad(result.name, nameWidth)}  ${padStart(ms(result.timings.p50), 9)}  ` +
        `${padStart(ms(result.timings.p95), 9)}  ${padStart(ms(result.cold), 9)}  ` +
        `${padStart(result.recording.dbMs === null ? '-' : ms(result.recording.dbMs), 8)}  ` +
        `${padStart(queries, 8)}  ${padStart(bytes, 9)}  ` +
        `${padStart(String(result.rows), 6)}`,
    )
  }
  console.log('')
}

async function main() {
  const args = process.argv.slice(2)
  const filterIndex = args.indexOf('--filter')
  const filter = filterIndex === -1 ? null : args[filterIndex + 1]
  const jsonIndex = args.indexOf('--json')
  const jsonPath = jsonIndex === -1 ? 'perf-report.json' : args[jsonIndex + 1]!

  const selected = filter
    ? steps.filter((step) => step.name.includes(filter))
    : steps

  if (selected.length === 0) {
    throw new Error(`No steps matched --filter ${filter}`)
  }

  console.log(`Target:  ${baseUrl}`)
  console.log(
    `Dataset: ${config.groups} groups, large group ${config.largeGroupExpenses} expenses / ` +
      `${config.largeGroupParticipants} participants`,
  )
  console.log(
    `Sampling: ${config.warmup} warmup + ${config.iterations} timed iterations per step`,
  )

  await waitForApp()

  const results: StepResult[] = []
  for (const step of selected) {
    process.stdout.write(`  running ${step.name} ... `)
    const result = await runStep(step)
    console.log(`${ms(result.timings.p50)} p50`)
    results.push(result)
  }

  report(results)

  const instrumented = results.some((r) => r.recording.dbQueries !== null)
  if (!instrumented) {
    console.log(
      'Note: the app is running without PERF_INSTRUMENTATION, so server-side ' +
        'query counts are unavailable and their budgets were skipped.',
    )
  }

  writeFileSync(
    jsonPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        baseUrl,
        config,
        instrumented,
        results,
      },
      null,
      2,
    )}\n`,
  )
  console.log(`Report written to ${jsonPath}`)

  const violations = results.flatMap((result) => {
    const budget = budgets[result.name]
    if (!budget) {
      console.warn(`No budget defined for step "${result.name}"`)
      return []
    }
    return checkBudget(result, budget)
  })

  if (violations.length > 0) {
    console.error('\nBudget exceeded:')
    for (const violation of violations) {
      console.error(
        `  ${violation.step}  ${violation.metric}: ${violation.actual} (budget ${violation.budget})`,
      )
    }
    console.error(
      '\nIf this change is intentional, update perf/budgets.ts with the new figures.',
    )
    process.exit(1)
  }

  console.log('All deterministic budgets met.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
