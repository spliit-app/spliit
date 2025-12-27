import {
  CATEGORY_LOOKUP,
  SpliitJsonFormat,
  resolveCategoryId,
} from './spliit-json'

describe('SpliitJsonFormat', () => {
  const format = new SpliitJsonFormat()

  describe('detect', () => {
    it('should return 0 for invalid JSON', async () => {
      expect(await format.detect('invalid json')).toBe(0)
    })

    it('should return 0 for JSON without required fields', async () => {
      expect(await format.detect('{}')).toBe(0)
      expect(await format.detect('{"foo": "bar"}')).toBe(0)
    })

    it('should return a high score for valid Spliit JSON', async () => {
      const content = JSON.stringify({
        participants: [{ name: 'Alice' }, { name: 'Bob' }],
        expenses: [
          {
            paidById: '1',
            paidFor: [{ participantId: '2', shares: 1 }],
            amount: 100,
            expenseDate: '2023-01-01',
            title: 'Test',
          },
        ],
      })
      expect(await format.detect(content)).toBeGreaterThan(0.8)
    })
  })

  describe('parseToInternal', () => {
    it('should parse a valid export correctly', async () => {
      const content = JSON.stringify({
        participants: [
          { id: 'p1', name: 'Alice' },
          { id: 'p2', name: 'Bob' },
        ],
        expenses: [
          {
            paidById: 'p1',
            paidFor: [
              { participantId: 'p2', shares: 1 },
              { participantId: 'p1', shares: 2 },
            ],
            amount: 1234, // 12.34
            expenseDate: '2023-05-20',
            title: 'Lunch',
            category: 'Food',
          },
        ],
        name: 'My Group',
        currency: '$',
      })

      const result = await format.parseToInternal(content)

      expect(result.errors).toHaveLength(0)
      expect(result.group).toEqual({
        name: 'My Group',
        currency: '$',
        currencyCode: undefined,
        participants: [{ name: 'Alice' }, { name: 'Bob' }],
      })

      expect(result.expenses).toHaveLength(1)
      const expense = result.expenses[0]
      expect(expense.title).toBe('Lunch')
      expect(expense.amount).toBe(1234)
      expect(expense.paidBy).toBe('Alice') // ID resolved to name
      expect(expense.paidFor).toHaveLength(2)
      expect(expense.paidFor).toContainEqual(
        expect.objectContaining({ participant: 'Bob', shares: 1 }),
      )
      expect(expense.paidFor).toContainEqual(
        expect.objectContaining({ participant: 'Alice', shares: 2 }),
      )
      expect(expense.expenseDate).toBeInstanceOf(Date)
      expect(expense.expenseDate.toISOString()).toContain('2023-05-20')
    })

    it('should handle missing participant names by falling back to ID or index', async () => {
      const content = JSON.stringify({
        participants: [
          { id: 'p1' }, // No name
          {}, // No ID or name
        ],
        expenses: [],
      })

      const result = await format.parseToInternal(content)
      const names = result.group?.participants?.map((p) => p.name)
      expect(names).toEqual(['p1', 'Participant 2'])
    })

    it('should collect errors for invalid expenses', async () => {
      const content = JSON.stringify({
        participants: [{ id: 'p1', name: 'Alice' }],
        expenses: [
          {
            paidById: 'p1',
            amount: 'invalid',
            title: 'Bad Amount',
            expenseDate: '2023-01-01',
          },
        ],
      })

      // Note: The current implementation is quite lenient.
      // - "invalid" amount might throw during coercion.

      const result = await format.parseToInternal(content)
      expect(result.errors).toHaveLength(1)
      expect(result.errors?.[0].message).toContain('Invalid amount')
    })
  })

  describe('CATEGORY_LOOKUP and resolveCategoryId', () => {
    // Exact mapping from DB migration/seeds
    const expectedCategories = [
      { id: 0, grouping: 'uncategorized', name: 'general' },
      { id: 1, grouping: 'uncategorized', name: 'payment' },
      { id: 2, grouping: 'entertainment', name: 'entertainment' },
      { id: 3, grouping: 'entertainment', name: 'games' },
      { id: 4, grouping: 'entertainment', name: 'movies' },
      { id: 5, grouping: 'entertainment', name: 'music' },
      { id: 6, grouping: 'entertainment', name: 'sports' },
      { id: 7, grouping: 'food and drink', name: 'food and drink' },
      { id: 8, grouping: 'food and drink', name: 'dining out' },
      { id: 9, grouping: 'food and drink', name: 'groceries' },
      { id: 10, grouping: 'food and drink', name: 'liquor' },
      { id: 11, grouping: 'home', name: 'home' },
      { id: 12, grouping: 'home', name: 'electronics' },
      { id: 13, grouping: 'home', name: 'furniture' },
      { id: 14, grouping: 'home', name: 'household supplies' },
      { id: 15, grouping: 'home', name: 'maintenance' },
      { id: 16, grouping: 'home', name: 'mortgage' },
      { id: 17, grouping: 'home', name: 'pets' },
      { id: 18, grouping: 'home', name: 'rent' },
      { id: 19, grouping: 'home', name: 'services' },
      { id: 20, grouping: 'life', name: 'childcare' },
      { id: 21, grouping: 'life', name: 'clothing' },
      { id: 22, grouping: 'life', name: 'education' },
      { id: 23, grouping: 'life', name: 'gifts' },
      { id: 24, grouping: 'life', name: 'insurance' },
      { id: 25, grouping: 'life', name: 'medical expenses' },
      { id: 26, grouping: 'life', name: 'taxes' },
      { id: 27, grouping: 'transportation', name: 'transportation' },
      { id: 28, grouping: 'transportation', name: 'bicycle' },
      { id: 29, grouping: 'transportation', name: 'bus/train' },
      { id: 30, grouping: 'transportation', name: 'car' },
      { id: 31, grouping: 'transportation', name: 'gas/fuel' },
      { id: 32, grouping: 'transportation', name: 'hotel' },
      { id: 33, grouping: 'transportation', name: 'parking' },
      { id: 34, grouping: 'transportation', name: 'plane' },
      { id: 35, grouping: 'transportation', name: 'taxi' },
      { id: 36, grouping: 'utilities', name: 'utilities' },
      { id: 37, grouping: 'utilities', name: 'cleaning' },
      { id: 38, grouping: 'utilities', name: 'electricity' },
      { id: 39, grouping: 'utilities', name: 'heat/gas' },
      { id: 40, grouping: 'utilities', name: 'trash' },
      { id: 41, grouping: 'utilities', name: 'tv/phone/internet' },
      { id: 42, grouping: 'utilities', name: 'water' },
      { id: 43, grouping: 'life', name: 'donation' },
    ]

    it('should have all expected categories in lookup', () => {
      // Ensure we haven't missed any
      expect(Object.keys(CATEGORY_LOOKUP).length).toBe(
        expectedCategories.length,
      )

      expectedCategories.forEach((cat) => {
        const key = `${cat.grouping}|${cat.name}`
        expect(CATEGORY_LOOKUP).toHaveProperty(key, cat.id)
      })
    })

    // Validate resolution logic for each category
    expectedCategories.forEach((cat) => {
      const { id, grouping, name } = cat

      it(`should resolve category [${id}] ${grouping}|${name} correctly`, () => {
        // 1. By ID (number)
        expect(resolveCategoryId(id)).toBe(id)

        // 2. By ID (string)
        expect(resolveCategoryId(String(id))).toBe(id)

        // 3. By full object
        expect(
          resolveCategoryId({
            grouping: grouping.toUpperCase(),
            name: name.toUpperCase(),
          }),
        ).toBe(id)

        // 4. By name only (fallback)
        expect(resolveCategoryId({ name: name.toUpperCase() })).toBe(id)
      })
    })

    it('should return default (0) for unknown categories or invalid input', () => {
      expect(resolveCategoryId(null)).toBe(0)
      expect(resolveCategoryId(undefined)).toBe(0)
      expect(resolveCategoryId('unknown')).toBe(0)
      expect(
        resolveCategoryId({ grouping: 'NonExistent', name: 'Category' }),
      ).toBe(0)
      expect(resolveCategoryId({ name: 'NonExistent' })).toBe(0)
    })
  })
})
