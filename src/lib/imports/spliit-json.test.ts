import { SpliitJsonFormat } from './spliit-json'

describe('SpliitJsonFormat', () => {
  const format = new SpliitJsonFormat()

  describe('detect', () => {
    it('should return 0 for invalid JSON', () => {
      expect(format.detect('invalid json')).toBe(0)
    })

    it('should return 0 for JSON without required fields', () => {
      expect(format.detect('{}')).toBe(0)
      expect(format.detect('{"foo": "bar"}')).toBe(0)
    })

    it('should return a high score for valid Spliit JSON', () => {
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
      expect(format.detect(content)).toBeGreaterThan(0.8)
    })
  })

  describe('parseToInternal', () => {
    it('should parse a valid export correctly', () => {
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

      const result = format.parseToInternal(content)

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

    it('should handle missing participant names by falling back to ID or index', () => {
      const content = JSON.stringify({
        participants: [
          { id: 'p1' }, // No name
          {}, // No ID or name
        ],
        expenses: [],
      })

      const result = format.parseToInternal(content)
      const names = result.group?.participants?.map((p) => p.name)
      expect(names).toEqual(['p1', 'Participant 2'])
    })

    it('should collect errors for invalid expenses', () => {
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

      const result = format.parseToInternal(content)
      expect(result.errors).toHaveLength(1)
      expect(result.errors?.[0].message).toContain('Invalid amount')
    })
  })
})
