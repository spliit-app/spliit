/**
 * Converts `perf-report.json` into the `customSmallerIsBetter` shape that
 * benchmark-action/github-action-benchmark consumes, so release builds land as
 * points on a trend chart.
 *
 * Emits two files, because the two kinds of metric need opposite treatment:
 *
 *   deterministic  query counts, response bytes, row counts. Exactly
 *                  reproducible, so the workflow alerts on them tightly and
 *                  fails on a regression.
 *   timing         p50 / p95 wall clock. Charted for the eye only, never
 *                  alerted -- see the note on runner noise in README.md.
 *
 * Usage: ts-node -T perf/to-benchmark-json.ts <report> <deterministic> <timing>
 */
import { readFileSync, writeFileSync } from 'node:fs'
import type { StepResult } from './harness'

type Entry = { name: string; unit: string; value: number }

type Report = {
  instrumented: boolean
  results: StepResult[]
}

function main() {
  const [reportPath, deterministicPath, timingPath] = process.argv.slice(2)
  if (!reportPath || !deterministicPath || !timingPath) {
    throw new Error(
      'usage: to-benchmark-json.ts <report> <deterministic-out> <timing-out>',
    )
  }

  const report = JSON.parse(readFileSync(reportPath, 'utf8')) as Report

  const deterministic: Entry[] = []
  const timing: Entry[] = []

  for (const result of report.results) {
    deterministic.push({
      name: `${result.name} bytes`,
      unit: 'bytes',
      value: result.recording.bytes,
    })
    if (result.recording.dbQueries !== null) {
      deterministic.push({
        name: `${result.name} queries`,
        unit: 'queries',
        value: result.recording.dbQueries,
      })
    }

    timing.push({
      name: `${result.name} p50`,
      unit: 'ms',
      value: Number(result.timings.p50.toFixed(2)),
    })
    timing.push({
      name: `${result.name} p95`,
      unit: 'ms',
      value: Number(result.timings.p95.toFixed(2)),
    })
  }

  if (deterministic.length === 0) {
    throw new Error(`No results found in ${reportPath}`)
  }

  writeFileSync(
    deterministicPath,
    `${JSON.stringify(deterministic, null, 2)}\n`,
  )
  writeFileSync(timingPath, `${JSON.stringify(timing, null, 2)}\n`)

  console.log(
    `Wrote ${deterministic.length} deterministic and ${timing.length} timing entries.`,
  )
}

main()
