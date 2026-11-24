import { Parser } from '@json2csv/plainjs'
import {
  expenseTagsSchema,
  getExpensesByTag,
  getExportTagNames,
  getSpendingByTag,
  normalizeTagName,
  resolveExpenseTagSelection,
  tagNameSchema,
} from './tags'
import { filterExpensesByDateRange, getTotalGroupSpending } from './totals'

describe('tag names', () => {
  it('reuses case and Unicode equivalent names while preserving the first display spelling', () => {
    expect(
      expenseTagsSchema.parse([
        { name: ' Summer trip ' },
        { name: 'summer TRIP' },
        { name: 'Ｃafé' },
        { name: 'Café' },
      ]),
    ).toEqual([{ name: 'Summer trip' }, { name: 'Ｃafé' }])
    expect(normalizeTagName('Cafe\u0301')).toBe(normalizeTagName('Café'))
  })

  it.each([
    '',
    '   ',
    'Trip\nname',
    '\tTrip',
    'Trip\u2028name',
    'a'.repeat(51),
  ])('rejects invalid tag %j', (name) => {
    expect(tagNameSchema.safeParse(name).success).toBe(false)
  })

  it('counts Unicode code points and allows punctuation', () => {
    expect(tagNameSchema.parse('🏖'.repeat(50))).toHaveLength(100)
    expect(tagNameSchema.parse('Dinner, "friends"; +family')).toBe(
      'Dinner, "friends"; +family',
    )
    expect(tagNameSchema.safeParse('🏖'.repeat(51)).success).toBe(false)
  })

  it('limits an expense to ten tags and accepts no tags', () => {
    expect(expenseTagsSchema.parse([])).toEqual([])
    expect(
      expenseTagsSchema.safeParse(
        Array.from({ length: 11 }, (_, i) => ({ name: `tag-${i}` })),
      ).success,
    ).toBe(false)
  })
})

describe('spending by tag', () => {
  const trip = { id: 'trip', name: 'Summer trip' }
  const work = { id: 'work', name: 'Work-related' }
  const expenses = [
    {
      id: 'dinner',
      amount: 6000,
      tags: [trip, work],
      isReimbursement: false,
      expenseDate: new Date('2026-07-01T00:00:00Z'),
    },
    {
      id: 'train',
      amount: 4000,
      tags: [trip],
      isReimbursement: false,
      expenseDate: new Date('2026-07-02T00:00:00Z'),
    },
    {
      id: 'groceries',
      amount: 2000,
      tags: [],
      isReimbursement: false,
      expenseDate: new Date('2026-07-03T00:00:00Z'),
    },
    {
      id: 'repayment',
      amount: 3000,
      tags: [trip],
      isReimbursement: true,
      expenseDate: new Date('2026-07-03T00:00:00Z'),
    },
  ]

  it('attributes the full amount to overlapping tags and excludes repayments', () => {
    expect(getSpendingByTag(expenses)).toEqual([
      { tagId: 'trip', name: 'Summer trip', total: 10000 },
      { tagId: 'work', name: 'Work-related', total: 6000 },
      { tagId: null, name: '', total: 2000 },
    ])
    expect(
      getTotalGroupSpending(
        expenses as Parameters<typeof getTotalGroupSpending>[0],
      ),
    ).toBe(12000)
  })

  it('reconciles date-filtered drilldowns with every reported bucket', () => {
    const ranged = filterExpensesByDateRange(
      expenses,
      '2026-07-02',
      '2026-07-03',
    )
    for (const bucket of getSpendingByTag(ranged)) {
      expect(
        getExpensesByTag(ranged, bucket.tagId).reduce(
          (total, expense) => total + expense.amount,
          0,
        ),
      ).toBe(bucket.total)
    }
    expect(
      getExpensesByTag(ranged, 'trip').map((expense) => expense.id),
    ).toEqual(['train'])
    expect(getExpensesByTag(ranged, null).map((expense) => expense.id)).toEqual(
      ['groceries'],
    )
    expect(getExpensesByTag(ranged, 'another-group-tag')).toEqual([])
  })

  it('handles refunds, empty groups, and an untagged reimbursement', () => {
    expect(getSpendingByTag([])).toEqual([])
    expect(
      getSpendingByTag([
        { ...expenses[0], amount: -1000 },
        { ...expenses[3], tags: [] },
      ]),
    ).toEqual([
      { tagId: 'trip', name: 'Summer trip', total: -1000 },
      { tagId: 'work', name: 'Work-related', total: -1000 },
    ])
  })
})

describe('tag exports', () => {
  it('preserves special characters in JSON and a single escaped CSV cell', () => {
    const names = ['Trip, "friends"', '=SUM(A1:A2)', '+Family', 'Café 🏖']
    const tags = getExportTagNames(names.map((name) => ({ name })))
    const cell = JSON.stringify(tags)
    const csv = new Parser({ fields: ['tags'] }).parse([{ tags: cell }])
    const encodedCell = csv.split('\n')[1]
    expect(JSON.parse(encodedCell.slice(1, -1).replace(/""/g, '"'))).toEqual(
      [...names].sort(),
    )
    expect(encodedCell.startsWith('"[')).toBe(true)
    expect(getExportTagNames([])).toEqual([])
  })
})

it('preserves IDs after vocabulary refresh and creates only explicit new names', () => {
  expect(
    resolveExpenseTagSelection(
      ['Work', 'Trip', 'New'],
      [{ id: 'deleted', name: 'Work' }],
      [{ id: 'trip', name: 'Trip' }],
    ),
  ).toEqual([
    { id: 'deleted', name: 'Work' },
    { id: 'trip', name: 'Trip' },
    { name: 'New' },
  ])
})
