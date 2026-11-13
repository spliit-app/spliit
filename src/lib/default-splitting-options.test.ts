import {
  hasOnlyGroupParticipants,
  defaultSplittingOptionsSchema as schema,
} from './default-splitting-options'

const alice = { participant: 'alice', shares: 6000 }
const bob = { participant: 'bob', shares: 4000 }

describe('default splitting options', () => {
  test.each([
    { splitMode: 'EVENLY', paidFor: [{ ...alice, shares: 100 }] },
    { splitMode: 'BY_SHARES', paidFor: [alice, bob] },
    { splitMode: 'BY_PERCENTAGE', paidFor: [alice, bob] },
    { splitMode: 'BY_AMOUNT', paidFor: null },
  ])('accepts a valid $splitMode default', (options) => {
    expect(schema.safeParse(options).success).toBe(true)
  })

  test.each([
    { splitMode: 'BY_SHARES', paidFor: [] },
    { splitMode: 'BY_SHARES', paidFor: [{ ...alice, shares: -1 }] },
    { splitMode: 'BY_SHARES', paidFor: [{ ...alice, shares: 1.5 }] },
    { splitMode: 'BY_SHARES', paidFor: [alice, alice] },
    { splitMode: 'BY_SHARES', paidFor: null },
    { splitMode: 'BY_AMOUNT', paidFor: [alice] },
    { splitMode: 'BY_PERCENTAGE', paidFor: [alice] },
    { splitMode: 'INVALID', paidFor: [alice] },
  ])('rejects an invalid default: $splitMode $paidFor', (options) => {
    expect(schema.safeParse(options).success).toBe(false)
  })

  test('accepts only participants currently in the group', () => {
    expect(hasOnlyGroupParticipants([alice, bob], ['alice', 'bob'])).toBe(true)
    expect(hasOnlyGroupParticipants([alice, bob], ['alice'])).toBe(false)
    expect(hasOnlyGroupParticipants(null, [])).toBe(true)
  })
})
