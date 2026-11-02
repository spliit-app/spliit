/**
 * Exact rational numbers of minor units, for sums that must not round until
 * the very end (balances, share totals).
 *
 * A share such as 2.93 split four ways is 73.25 minor units. Rounding it on
 * every expense makes each participant's running total drift by up to one
 * unit per uneven expense; keeping it as a fraction and rounding the final
 * total keeps every participant within one minor unit of their exact amount.
 *
 * Built on `bigint` so long-lived groups with many uneven splits cannot lose
 * precision as the denominators grow.
 */

const ZERO = BigInt(0)
const ONE = BigInt(1)

/** `num / den`, always reduced, with `den > 0`. */
export type Fraction = { readonly num: bigint; readonly den: bigint }

export const FRACTION_ZERO: Fraction = { num: ZERO, den: ONE }

function abs(value: bigint): bigint {
  return value < ZERO ? -value : value
}

function gcd(a: bigint, b: bigint): bigint {
  a = abs(a)
  b = abs(b)
  while (b !== ZERO) {
    const t = a % b
    a = b
    b = t
  }
  return a
}

export function fraction(
  num: bigint | number,
  den: bigint | number = ONE,
): Fraction {
  let n = typeof num === 'bigint' ? num : BigInt(Math.round(num))
  let d = typeof den === 'bigint' ? den : BigInt(Math.round(den))
  if (d === ZERO)
    throw new RangeError('A fraction cannot have a zero denominator')
  if (d < ZERO) {
    n = -n
    d = -d
  }
  const divisor = gcd(n, d)
  return divisor > ONE
    ? { num: n / divisor, den: d / divisor }
    : { num: n, den: d }
}

export function addFractions(a: Fraction, b: Fraction): Fraction {
  if (a.den === b.den) return fraction(a.num + b.num, a.den)
  return fraction(a.num * b.den + b.num * a.den, a.den * b.den)
}

export function subtractFractions(a: Fraction, b: Fraction): Fraction {
  return addFractions(a, { num: -b.num, den: b.den })
}

/** Negative when `a < b`, zero when equal, positive when `a > b`. */
export function compareFractions(a: Fraction, b: Fraction): number {
  const left = a.num * b.den
  const right = b.num * a.den
  return left < right ? -1 : left > right ? 1 : 0
}

/** Largest integer not greater than `value`. */
export function floorFraction(value: Fraction): bigint {
  const quotient = value.num / value.den // truncates toward zero
  return value.num < ZERO && quotient * value.den !== value.num
    ? quotient - ONE
    : quotient
}

/** Integer part of `value`, dropping the fraction toward zero. */
export function truncateFraction(value: Fraction): bigint {
  return value.num / value.den
}

/**
 * Rounds exact amounts whose sum is a whole number into whole numbers with
 * that same sum, moving each value by less than one unit.
 *
 * - `floor` rounds everything down, then hands the missing units to the
 *   values that lost the most (largest remainder).
 * - `towardZero` truncates instead, so a debt or a credit is never rounded
 *   up in magnitude unless the sum requires it. That is what balances want:
 *   once every suggested reimbursement is booked, what is left of each
 *   balance is a fraction of a unit, which truncates to exactly zero and the
 *   group reads as settled.
 *
 * Ties go to the smaller key, so the result does not depend on the order the
 * values were added in.
 */
export function roundPreservingSum(
  values: Map<string, Fraction>,
  mode: 'floor' | 'towardZero',
): Map<string, number> {
  const entries = Array.from(values.entries()).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  )
  const total = entries.reduce(
    (sum, [, value]) => addFractions(sum, value),
    FRACTION_ZERO,
  )
  if (total.den !== ONE) {
    throw new RangeError(
      'roundPreservingSum needs values that add up to a whole number',
    )
  }

  const rounded = entries.map(([key, value]) => {
    const base =
      mode === 'floor' ? floorFraction(value) : truncateFraction(value)
    // How far rounding moved the value: positive when it was rounded down.
    const loss = subtractFractions(value, fraction(base))
    return { key, base, loss }
  })

  let missing = total.num - rounded.reduce((sum, { base }) => sum + base, ZERO)
  const step = missing > ZERO ? ONE : -ONE
  const candidates = rounded
    .filter(({ loss }) => (step > ZERO ? loss.num > ZERO : loss.num < ZERO))
    .sort((a, b) => {
      // Biggest loss in the direction we need first; ties keep key order.
      const byLoss =
        step > ZERO
          ? compareFractions(b.loss, a.loss)
          : compareFractions(a.loss, b.loss)
      return byLoss !== 0 ? byLoss : a.key < b.key ? -1 : 1
    })
  for (const candidate of candidates) {
    if (missing === ZERO) break
    candidate.base += step
    missing -= step
  }

  return new Map(rounded.map(({ key, base }) => [key, Number(base)]))
}
