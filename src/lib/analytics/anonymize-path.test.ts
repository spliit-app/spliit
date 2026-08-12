import { anonymizePath } from './anonymize-path'

/**
 * Made-up IDs, shaped like the real ones (21-character nanoid for groups, cuid
 * for expenses). Never paste a real ID in here: this file is public.
 */
const GROUP_A = 'exampleGroupId0000000'
const GROUP_B = 'anotherGroupId0000000'
const GROUP_C = 'thirdGroupId000000000'
const GROUP_D = 'fourthGroupId00000000'
const EXPENSE = 'exampleExpenseId000000000'

describe('anonymizePath', () => {
  const cases: [path: string, expected: string][] = [
    // Group IDs
    [`/groups/${GROUP_A}`, '/groups/[groupId]'],
    [`/groups/${GROUP_A}/expenses`, '/groups/[groupId]/expenses'],
    [`/groups/${GROUP_B}/balances`, '/groups/[groupId]/balances'],
    [`/groups/${GROUP_C}/edit`, '/groups/[groupId]/edit'],
    [`/groups/${GROUP_D}/stats`, '/groups/[groupId]/stats'],

    // Expense IDs
    [
      `/groups/${GROUP_A}/expenses/${EXPENSE}/edit`,
      '/groups/[groupId]/expenses/[expenseId]/edit',
    ],

    // Static segments in an ID position are kept
    ['/groups/create', '/groups/create'],
    [`/groups/${GROUP_A}/expenses/create`, '/groups/[groupId]/expenses/create'],
    [
      `/groups/${GROUP_A}/expenses/export/csv`,
      '/groups/[groupId]/expenses/export/csv',
    ],
    [
      `/groups/${GROUP_A}/expenses/export/json`,
      '/groups/[groupId]/expenses/export/json',
    ],

    // Query strings and hashes are preserved, and never scanned for IDs
    [
      `/groups/${GROUP_A}/expenses?ref=share`,
      '/groups/[groupId]/expenses?ref=share',
    ],
    ['/groups/create?ref=share', '/groups/create?ref=share'],

    // Paths without IDs are untouched
    ['/', '/'],
    ['/groups', '/groups'],
  ]

  test.each(cases)('%s → %s', (path, expected) => {
    expect(anonymizePath(path)).toBe(expected)
  })

  it('is idempotent', () => {
    const once = anonymizePath(`/groups/${GROUP_A}/expenses`)
    expect(anonymizePath(once)).toBe(once)
  })
})
