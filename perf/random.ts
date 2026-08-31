/**
 * Seeded PRNG, so every run of `perf/seed.ts` produces byte-identical data.
 *
 * This is load-bearing rather than a nicety: the deterministic budgets in
 * `budgets.ts` assert on response sizes and row counts, which are only stable
 * if the rows themselves are. `Math.random()` would make the whole gate flap.
 *
 * mulberry32 -- 32 bits of state, no dependency, and more than good enough for
 * generating plausible expense titles and amounts.
 */
export function makeRandom(seed: number) {
  let state = seed >>> 0

  const next = (): number => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  return {
    next,
    /** Integer in [min, max]. */
    int: (min: number, max: number) =>
      min + Math.floor(next() * (max - min + 1)),
    pick: <T>(items: readonly T[]): T =>
      items[Math.floor(next() * items.length)]!,
  }
}
