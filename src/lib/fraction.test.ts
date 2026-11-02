import {
  addFractions,
  compareFractions,
  floorFraction,
  fraction,
  roundPreservingSum,
  truncateFraction,
} from './fraction'

describe('fraction', () => {
  it('reduces and keeps the sign on the numerator', () => {
    expect(fraction(6, -4)).toEqual({ num: BigInt(-3), den: BigInt(2) })
    expect(addFractions(fraction(1, 3), fraction(2, 3))).toEqual(fraction(1))
  })

  it('floors and truncates negative values correctly', () => {
    expect(floorFraction(fraction(-7, 2))).toBe(BigInt(-4))
    expect(truncateFraction(fraction(-7, 2))).toBe(BigInt(-3))
    expect(floorFraction(fraction(7, 2))).toBe(BigInt(3))
  })

  it('compares', () => {
    expect(compareFractions(fraction(1, 3), fraction(1, 2))).toBeLessThan(0)
    expect(compareFractions(fraction(2, 4), fraction(1, 2))).toBe(0)
  })
})

describe('roundPreservingSum', () => {
  it('keeps the sum and moves each value by less than one unit', () => {
    const values = new Map([
      ['a', fraction(200, 3)],
      ['b', fraction(-100, 3)],
      ['c', fraction(-100, 3)],
    ])
    for (const mode of ['floor', 'towardZero'] as const) {
      const rounded = roundPreservingSum(values, mode)
      expect(Array.from(rounded.values()).reduce((s, v) => s + v, 0)).toBe(0)
      for (const [key, value] of values) {
        const gap = Math.abs(
          Number(value.num) / Number(value.den) - rounded.get(key)!,
        )
        expect(gap).toBeLessThan(1)
      }
    }
  })

  it('rounds fractions of a unit to zero toward zero', () => {
    // What is left of balances once every suggested reimbursement is booked.
    const rounded = roundPreservingSum(
      new Map([
        ['a', fraction(2, 3)],
        ['b', fraction(-1, 3)],
        ['c', fraction(-1, 3)],
      ]),
      'towardZero',
    )
    expect(Object.fromEntries(rounded)).toEqual({ a: 0, b: 0, c: 0 })
  })

  it('hands the missing units to the largest remainders', () => {
    const rounded = roundPreservingSum(
      new Map([
        ['a', fraction(9, 10)],
        ['b', fraction(1, 10)],
        ['c', fraction(1)],
      ]),
      'floor',
    )
    expect(Object.fromEntries(rounded)).toEqual({ a: 1, b: 0, c: 1 })
  })

  it('refuses values that do not add up to a whole number', () => {
    expect(() =>
      roundPreservingSum(new Map([['a', fraction(1, 2)]]), 'floor'),
    ).toThrow(RangeError)
  })
})
