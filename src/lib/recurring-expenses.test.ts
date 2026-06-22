import { RecurrenceRule } from '@prisma/client'
import { calculateNextDate } from './recurring-expenses'

describe('calculateNextDate', () => {
  describe('DAILY recurrence', () => {
    it('increments date by one day', () => {
      const input = new Date(Date.UTC(2025, 0, 15, 0, 0, 0))
      const result = calculateNextDate(RecurrenceRule.DAILY, input)

      expect(result.getUTCFullYear()).toBe(2025)
      expect(result.getUTCMonth()).toBe(0)
      expect(result.getUTCDate()).toBe(16)
    })

    it('handles month boundary', () => {
      const input = new Date(Date.UTC(2025, 0, 31, 0, 0, 0))
      const result = calculateNextDate(RecurrenceRule.DAILY, input)

      expect(result.getUTCFullYear()).toBe(2025)
      expect(result.getUTCMonth()).toBe(1)
      expect(result.getUTCDate()).toBe(1)
    })

    it('handles year boundary', () => {
      const input = new Date(Date.UTC(2025, 11, 31, 0, 0, 0))
      const result = calculateNextDate(RecurrenceRule.DAILY, input)

      expect(result.getUTCFullYear()).toBe(2026)
      expect(result.getUTCMonth()).toBe(0)
      expect(result.getUTCDate()).toBe(1)
    })
  })

  describe('WEEKLY recurrence', () => {
    it('increments date by 7 days', () => {
      const input = new Date(Date.UTC(2025, 2, 15, 0, 0, 0))
      const result = calculateNextDate(RecurrenceRule.WEEKLY, input)

      expect(result.getUTCFullYear()).toBe(2025)
      expect(result.getUTCMonth()).toBe(2)
      expect(result.getUTCDate()).toBe(22)
    })

    it('handles month boundary crossing multiple weeks', () => {
      const input = new Date(Date.UTC(2025, 0, 28, 0, 0, 0))
      const result = calculateNextDate(RecurrenceRule.WEEKLY, input)

      expect(result.getUTCFullYear()).toBe(2025)
      expect(result.getUTCMonth()).toBe(1)
      expect(result.getUTCDate()).toBe(4)
    })
  })

  describe('MONTHLY recurrence - month boundary handling', () => {
    it('handles Jan 31 to Feb 28 (non-leap year)', () => {
      const input = new Date(Date.UTC(2025, 0, 31, 0, 0, 0))
      const result = calculateNextDate(RecurrenceRule.MONTHLY, input)

      expect(result.getUTCFullYear()).toBe(2025)
      expect(result.getUTCMonth()).toBe(1)
      expect(result.getUTCDate()).toBe(28)
    })

    it('handles Jan 31 to Feb 29 (leap year)', () => {
      const input = new Date(Date.UTC(2024, 0, 31, 0, 0, 0))
      const result = calculateNextDate(RecurrenceRule.MONTHLY, input)

      expect(result.getUTCFullYear()).toBe(2024)
      expect(result.getUTCMonth()).toBe(1)
      expect(result.getUTCDate()).toBe(29)
    })

    it('handles Mar 31 to Apr 30', () => {
      const input = new Date(Date.UTC(2025, 2, 31, 0, 0, 0))
      const result = calculateNextDate(RecurrenceRule.MONTHLY, input)

      expect(result.getUTCFullYear()).toBe(2025)
      expect(result.getUTCMonth()).toBe(3)
      expect(result.getUTCDate()).toBe(30)
    })

    it('handles May 31 to Jun 30', () => {
      const input = new Date(Date.UTC(2025, 4, 31, 0, 0, 0))
      const result = calculateNextDate(RecurrenceRule.MONTHLY, input)

      expect(result.getUTCFullYear()).toBe(2025)
      expect(result.getUTCMonth()).toBe(5)
      expect(result.getUTCDate()).toBe(30)
    })

    it('handles Jul 31 to Aug 31 (August has 31 days)', () => {
      const input = new Date(Date.UTC(2025, 6, 31, 0, 0, 0))
      const result = calculateNextDate(RecurrenceRule.MONTHLY, input)

      expect(result.getUTCFullYear()).toBe(2025)
      expect(result.getUTCMonth()).toBe(7)
      expect(result.getUTCDate()).toBe(31)
    })

    it('handles Aug 31 to Sep 30', () => {
      const input = new Date(Date.UTC(2025, 7, 31, 0, 0, 0))
      const result = calculateNextDate(RecurrenceRule.MONTHLY, input)

      expect(result.getUTCFullYear()).toBe(2025)
      expect(result.getUTCMonth()).toBe(8)
      expect(result.getUTCDate()).toBe(30)
    })

    it('handles Oct 31 to Nov 30', () => {
      const input = new Date(Date.UTC(2025, 9, 31, 0, 0, 0))
      const result = calculateNextDate(RecurrenceRule.MONTHLY, input)

      expect(result.getUTCFullYear()).toBe(2025)
      expect(result.getUTCMonth()).toBe(10)
      expect(result.getUTCDate()).toBe(30)
    })

    it('handles Dec 31 to Jan 31 (next year)', () => {
      const input = new Date(Date.UTC(2025, 11, 31, 0, 0, 0))
      const result = calculateNextDate(RecurrenceRule.MONTHLY, input)

      expect(result.getUTCFullYear()).toBe(2026)
      expect(result.getUTCMonth()).toBe(0)
      expect(result.getUTCDate()).toBe(31)
    })

    it('handles Feb 28 to Mar 28 (non-leap year, not 31)', () => {
      const input = new Date(Date.UTC(2025, 1, 28, 0, 0, 0))
      const result = calculateNextDate(RecurrenceRule.MONTHLY, input)

      expect(result.getUTCFullYear()).toBe(2025)
      expect(result.getUTCMonth()).toBe(2)
      expect(result.getUTCDate()).toBe(28)
    })

    it('handles Feb 29 to Mar 29 (leap year)', () => {
      const input = new Date(Date.UTC(2024, 1, 29, 0, 0, 0))
      const result = calculateNextDate(RecurrenceRule.MONTHLY, input)

      expect(result.getUTCFullYear()).toBe(2024)
      expect(result.getUTCMonth()).toBe(2)
      expect(result.getUTCDate()).toBe(29)
    })

    it('handles Apr 30 to May 30 (keeps same day number)', () => {
      const input = new Date(Date.UTC(2025, 3, 30, 0, 0, 0))
      const result = calculateNextDate(RecurrenceRule.MONTHLY, input)

      expect(result.getUTCFullYear()).toBe(2025)
      expect(result.getUTCMonth()).toBe(4)
      expect(result.getUTCDate()).toBe(30)
    })

    it('handles Jun 30 to Jul 30 (keeps same day number)', () => {
      const input = new Date(Date.UTC(2025, 5, 30, 0, 0, 0))
      const result = calculateNextDate(RecurrenceRule.MONTHLY, input)

      expect(result.getUTCFullYear()).toBe(2025)
      expect(result.getUTCMonth()).toBe(6)
      expect(result.getUTCDate()).toBe(30)
    })

    it('handles Sep 30 to Oct 30 (keeps same day number)', () => {
      const input = new Date(Date.UTC(2025, 8, 30, 0, 0, 0))
      const result = calculateNextDate(RecurrenceRule.MONTHLY, input)

      expect(result.getUTCFullYear()).toBe(2025)
      expect(result.getUTCMonth()).toBe(9)
      expect(result.getUTCDate()).toBe(30)
    })

    it('handles Nov 30 to Dec 30 (Dec has 31 days, keeps 30)', () => {
      const input = new Date(Date.UTC(2025, 10, 30, 0, 0, 0))
      const result = calculateNextDate(RecurrenceRule.MONTHLY, input)

      expect(result.getUTCFullYear()).toBe(2025)
      expect(result.getUTCMonth()).toBe(11)
      expect(result.getUTCDate()).toBe(30)
    })
  })
})
