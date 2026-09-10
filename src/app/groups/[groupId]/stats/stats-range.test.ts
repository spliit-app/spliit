import {
  getRangeForPeriod,
  resolveStatsRange,
  STATS_PERIODS,
} from './stats-range'

describe('getRangeForPeriod', () => {
  const now = new Date('2026-07-09T12:00:00')

  it('returns an empty range for "all"', () => {
    expect(getRangeForPeriod('all', now)).toEqual({})
  })

  it('returns an empty range for "custom"', () => {
    expect(getRangeForPeriod('custom', now)).toEqual({})
  })

  it('covers the current month', () => {
    expect(getRangeForPeriod('thisMonth', now)).toEqual({
      from: '2026-07-01',
      to: '2026-07-09',
    })
  })

  it('covers the last 30 days inclusively', () => {
    expect(getRangeForPeriod('last30', now)).toEqual({
      from: '2026-06-10',
      to: '2026-07-09',
    })
  })

  it('covers the current year', () => {
    expect(getRangeForPeriod('thisYear', now)).toEqual({
      from: '2026-01-01',
      to: '2026-07-09',
    })
  })
})

describe('resolveStatsRange', () => {
  const now = new Date('2026-07-09T12:00:00')

  it('delegates to getRangeForPeriod for named periods', () => {
    expect(resolveStatsRange('thisYear', {}, now)).toEqual(
      getRangeForPeriod('thisYear', now),
    )
  })

  it('ignores the custom range for named periods', () => {
    expect(
      resolveStatsRange('all', { from: '2026-01-01', to: '2026-02-01' }, now),
    ).toEqual({})
  })

  it('passes a custom range through verbatim', () => {
    expect(
      resolveStatsRange(
        'custom',
        { from: '2026-01-01', to: '2026-03-31' },
        now,
      ),
    ).toEqual({ from: '2026-01-01', to: '2026-03-31' })
  })

  it('supports open-ended custom bounds', () => {
    expect(resolveStatsRange('custom', { from: '2026-02-01' }, now)).toEqual({
      from: '2026-02-01',
      to: undefined,
    })
    expect(resolveStatsRange('custom', { to: '2026-02-01' }, now)).toEqual({
      from: undefined,
      to: '2026-02-01',
    })
  })

  it('drops empty strings so partial input does not over-filter', () => {
    expect(resolveStatsRange('custom', { from: '', to: '' }, now)).toEqual({
      from: undefined,
      to: undefined,
    })
  })

  it('swaps reversed bounds', () => {
    expect(
      resolveStatsRange(
        'custom',
        { from: '2026-03-31', to: '2026-01-01' },
        now,
      ),
    ).toEqual({ from: '2026-01-01', to: '2026-03-31' })
  })
})

describe('STATS_PERIODS', () => {
  it('includes the custom option', () => {
    expect(STATS_PERIODS).toContain('custom')
  })
})
