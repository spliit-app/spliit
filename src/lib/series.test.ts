import {
  getInstallmentAmount,
  getInstallmentAmounts,
  getOccurrenceValues,
  getRemainingInstallments,
  getSeriesDates,
  getSeriesSettings,
  isWithinSeries,
  projectOccurrences,
  rescaleAmountShares,
  toDateKey,
} from './series'

const day = (value: string) => new Date(`${value}T00:00:00.000Z`)
const keys = (dates: { date: Date }[] | Date[]) =>
  dates.map((value) => toDateKey(value instanceof Date ? value : value.date))

describe('isWithinSeries', () => {
  it('accepts every occurrence of a series without end', () => {
    expect(isWithinSeries(null, 99, day('2040-01-01'))).toBe(true)
    expect(
      isWithinSeries(
        { endDate: null, occurrenceCount: null },
        99,
        day('2040-01-01'),
      ),
    ).toBe(true)
  })

  it('stops after the last counted occurrence', () => {
    const bounds = { endDate: null, occurrenceCount: 5 }
    expect(isWithinSeries(bounds, 5, day('2027-03-16'))).toBe(true)
    expect(isWithinSeries(bounds, 6, day('2027-04-16'))).toBe(false)
  })

  it('includes the end date itself', () => {
    const bounds = { endDate: day('2027-06-10'), occurrenceCount: null }
    expect(isWithinSeries(bounds, 8, day('2027-06-10'))).toBe(true)
    expect(isWithinSeries(bounds, 9, day('2027-06-11'))).toBe(false)
  })

  it('does not cut off an occurrence without a number by count', () => {
    const bounds = { endDate: null, occurrenceCount: 2 }
    expect(isWithinSeries(bounds, null, day('2030-01-01'))).toBe(true)
  })
})

describe('installment amounts', () => {
  it('adds up to the total, the extra cents going to the first ones', () => {
    expect(getInstallmentAmounts(10000, 3)).toEqual([3334, 3333, 3333])
    expect(getInstallmentAmounts(100000, 5)).toEqual([
      20000, 20000, 20000, 20000, 20000,
    ])
    const amounts = getInstallmentAmounts(99999, 7)
    expect(amounts.reduce((sum, amount) => sum + amount, 0)).toBe(99999)
  })

  it('returns a single installment by its number', () => {
    expect(getInstallmentAmount(10000, 3, 1)).toBe(3334)
    expect(getInstallmentAmount(10000, 3, 3)).toBe(3333)
    expect(getInstallmentAmount(10000, 3, 4)).toBe(0)
  })
})

describe('rescaleAmountShares', () => {
  it('keeps the proportions and adds up to the new amount', () => {
    const shares = rescaleAmountShares(
      [
        { participantId: 'b', shares: 30000 },
        { participantId: 'a', shares: 70000 },
      ],
      33334,
    )
    expect(shares.find((p) => p.participantId === 'a')?.shares).toBe(23334)
    expect(shares.find((p) => p.participantId === 'b')?.shares).toBe(10000)
    expect(shares.reduce((sum, p) => sum + p.shares, 0)).toBe(33334)
  })
})

describe('getOccurrenceValues', () => {
  const source = {
    amount: 33334,
    originalAmount: null,
    splitMode: 'EVENLY',
    paidFor: [
      { participantId: 'a', shares: 100 },
      { participantId: 'b', shares: 100 },
    ],
  }

  it('repeats the source when the series has no total', () => {
    expect(
      getOccurrenceValues(
        source,
        { occurrenceCount: null, totalAmount: null, totalOriginalAmount: null },
        4,
      ),
    ).toEqual({
      amount: 33334,
      originalAmount: null,
      paidFor: source.paidFor,
    })
  })

  it('gives each installment its own part of the total', () => {
    const series = {
      occurrenceCount: 3,
      totalAmount: 100000,
      totalOriginalAmount: 20000,
    }
    expect(getOccurrenceValues(source, series, 2)).toMatchObject({
      amount: 33333,
      originalAmount: 6667,
      paidFor: source.paidFor, // ratios are kept as they are
    })
  })

  it('rescales amount shares of an installment', () => {
    const values = getOccurrenceValues(
      {
        ...source,
        splitMode: 'BY_AMOUNT',
        paidFor: [
          { participantId: 'a', shares: 25000 },
          { participantId: 'b', shares: 8334 },
        ],
      },
      { occurrenceCount: 3, totalAmount: 100000, totalOriginalAmount: null },
      3,
    )
    expect(values.amount).toBe(33333)
    expect(values.paidFor.reduce((sum, p) => sum + p.shares, 0)).toBe(33333)
  })
})

describe('projectOccurrences', () => {
  it('lists the remaining installments up to the end of the plan', () => {
    const occurrences = projectOccurrences({
      rule: 'MONTHLY',
      nextDate: day('2026-12-31'),
      anchorDay: 31,
      nextOccurrenceNumber: 2,
      bounds: { endDate: null, occurrenceCount: 4 },
      until: day('2030-01-01'),
    })
    expect(keys(occurrences)).toEqual([
      '2026-12-31',
      '2027-01-31',
      '2027-02-28',
    ])
    expect(occurrences.map((o) => o.occurrenceNumber)).toEqual([2, 3, 4])
  })

  it('stops at the horizon for a series without end', () => {
    const occurrences = projectOccurrences({
      rule: 'WEEKLY',
      nextDate: day('2026-12-01'),
      anchorDay: null,
      nextOccurrenceNumber: null,
      bounds: null,
      until: day('2026-12-31'),
    })
    expect(keys(occurrences)).toEqual([
      '2026-12-01',
      '2026-12-08',
      '2026-12-15',
      '2026-12-22',
      '2026-12-29',
    ])
  })

  it('stops on the end date', () => {
    const occurrences = projectOccurrences({
      rule: 'MONTHLY',
      nextDate: day('2027-01-10'),
      anchorDay: 10,
      nextOccurrenceNumber: 3,
      bounds: { endDate: day('2027-03-09'), occurrenceCount: null },
      until: day('2030-01-01'),
    })
    expect(keys(occurrences)).toEqual(['2027-01-10', '2027-02-10'])
  })

  it('projects nothing for a series that does not repeat', () => {
    expect(
      projectOccurrences({
        rule: 'NONE',
        nextDate: day('2027-01-10'),
        anchorDay: null,
        nextOccurrenceNumber: 2,
        bounds: null,
        until: day('2030-01-01'),
      }),
    ).toEqual([])
  })
})

describe('getSeriesDates', () => {
  it('lists every installment', () => {
    expect(
      keys(
        getSeriesDates('MONTHLY', day('2026-11-16'), {
          endDate: null,
          occurrenceCount: 5,
        }),
      ),
    ).toEqual([
      '2026-11-16',
      '2026-12-16',
      '2027-01-16',
      '2027-02-16',
      '2027-03-16',
    ])
  })

  it('counts the occurrences until an end date', () => {
    expect(
      getSeriesDates('MONTHLY', day('2026-11-10'), {
        endDate: day('2027-06-10'),
        occurrenceCount: null,
      }),
    ).toHaveLength(8)
  })

  it('caps a series without end', () => {
    expect(getSeriesDates('DAILY', day('2026-11-10'), null, 4)).toHaveLength(4)
  })
})

describe('getSeriesSettings', () => {
  const base = {
    recurrenceRule: 'MONTHLY' as const,
    seriesKind: 'RECURRING' as const,
    recurrenceEnd: 'NEVER' as const,
    installmentAmountIsTotal: true,
    amount: 100000,
  }

  it('is null for an expense that does not repeat', () => {
    expect(getSeriesSettings({ ...base, recurrenceRule: 'NONE' })).toBeNull()
  })

  it('keeps only the end that was chosen', () => {
    expect(
      getSeriesSettings({
        ...base,
        recurrenceEnd: 'ON_DATE',
        recurrenceEndDate: day('2027-06-10'),
        recurrenceOccurrences: 12,
      }),
    ).toMatchObject({ endDate: day('2027-06-10'), occurrenceCount: null })
    expect(
      getSeriesSettings({
        ...base,
        recurrenceEnd: 'AFTER_OCCURRENCES',
        recurrenceEndDate: day('2027-06-10'),
        recurrenceOccurrences: 12,
      }),
    ).toMatchObject({ endDate: null, occurrenceCount: 12 })
  })

  it('splits an installment purchase total', () => {
    expect(
      getSeriesSettings({
        ...base,
        seriesKind: 'INSTALLMENTS',
        recurrenceOccurrences: 5,
        originalAmount: 20000,
      }),
    ).toEqual({
      kind: 'INSTALLMENTS',
      endDate: null,
      occurrenceCount: 5,
      totalAmount: 100000,
      totalOriginalAmount: 20000,
    })
    expect(
      getSeriesSettings({
        ...base,
        seriesKind: 'INSTALLMENTS',
        recurrenceOccurrences: 5,
        installmentAmountIsTotal: false,
      }),
    ).toMatchObject({ occurrenceCount: 5, totalAmount: null })
  })
})

describe('getRemainingInstallments', () => {
  it('sums what is left of a purchase total', () => {
    expect(
      getRemainingInstallments(
        { occurrenceCount: 3, totalAmount: 10000, totalOriginalAmount: null },
        1,
        3334,
      ),
    ).toEqual({ count: 2, amount: 6666 })
  })

  it('multiplies a repeated installment amount', () => {
    expect(
      getRemainingInstallments(
        { occurrenceCount: 10, totalAmount: null, totalOriginalAmount: null },
        4,
        15000,
      ),
    ).toEqual({ count: 6, amount: 90000 })
  })
})
