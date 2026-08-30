/**
 * Runs one step many times and reduces it to a result row.
 *
 * Deliberately not a benchmark library: each iteration here is a 10-100 ms HTTP
 * round trip to a real database, not a microbenchmark, so the sampling
 * machinery a bench library exists to provide (nanosecond timers, adaptive
 * iteration counts, outlier trimming) has nothing to bite on. Warmup plus
 * percentiles is the whole of it.
 */
import { performance } from 'node:perf_hooks'
import { type Recording, withRecording } from './client'
import { config } from './config'

/**
 * A step returns the number of rows it received, which is the third
 * deterministic signal alongside request count and byte size. What counts as a
 * "row" is scenario-specific and documented at each call site.
 */
export type Step = {
  name: string
  run: () => Promise<number>
}

export type Timings = {
  min: number
  p50: number
  p95: number
  p99: number
  max: number
}

export type StepResult = {
  name: string
  iterations: number
  /** First call against a freshly started app: cold caches, cold connection pool. */
  cold: number
  timings: Timings
  rows: number
  recording: Recording
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return Number.NaN
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  )
  return sorted[index]!
}

/**
 * Fails when a supposedly deterministic value moves between iterations of the
 * same step. If this trips, the gate is not trustworthy -- the dataset or the
 * scenario has hidden state in it -- and that is worth stopping for rather than
 * quietly averaging away.
 */
function assertStable(
  step: string,
  field: string,
  first: number | null,
  seen: number | null,
) {
  if (first !== seen) {
    throw new Error(
      `Non-deterministic ${field} in step "${step}": got ${seen} after ${first}. ` +
        `The suite cannot gate on a value that changes between identical calls.`,
    )
  }
}

export async function runStep(step: Step): Promise<StepResult> {
  // The very first call also pays for the connection pool opening and Next.js
  // compiling the route, so it is reported separately rather than folded into
  // the percentiles.
  const coldStart = performance.now()
  await withRecording(step.run)
  const cold = performance.now() - coldStart

  for (let i = 1; i < config.warmup; i++) {
    await withRecording(step.run)
  }

  const samples: number[] = []
  let reference: { rows: number; recording: Recording } | null = null

  for (let i = 0; i < config.iterations; i++) {
    const start = performance.now()
    const { result: rows, recording } = await withRecording(step.run)
    samples.push(performance.now() - start)

    if (reference === null) {
      reference = { rows, recording }
    } else {
      assertStable(step.name, 'row count', reference.rows, rows)
      assertStable(
        step.name,
        'request count',
        reference.recording.requests,
        recording.requests,
      )
      assertStable(
        step.name,
        'response bytes',
        reference.recording.bytes,
        recording.bytes,
      )
      assertStable(
        step.name,
        'query count',
        reference.recording.dbQueries,
        recording.dbQueries,
      )
      // dbMs is a duration, not a deterministic value -- keep the fastest seen
      // as a representative figure.
      if (
        recording.dbMs !== null &&
        (reference.recording.dbMs === null ||
          recording.dbMs < reference.recording.dbMs)
      ) {
        reference.recording.dbMs = recording.dbMs
      }
    }
  }

  const sorted = [...samples].sort((a, b) => a - b)

  return {
    name: step.name,
    iterations: config.iterations,
    cold,
    timings: {
      min: sorted[0]!,
      p50: percentile(sorted, 50),
      p95: percentile(sorted, 95),
      p99: percentile(sorted, 99),
      max: sorted[sorted.length - 1]!,
    },
    rows: reference!.rows,
    recording: reference!.recording,
  }
}
