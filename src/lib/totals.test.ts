import { SplitMode } from '@prisma/client'
import { calculateShare, calculateShares } from './totals';

const p1 = { id: 'p1', name: 'Participant 1' };
const p2 = { id: 'p2', name: 'Participant 2' };
const p3 = { id: 'p3', name: 'Participant 3' };

const expenseBase = {
  id: 'expense-1',
  amount: 10000,
  isReimbursement: false,
  paidBy: p1,
  expenseDate: new Date('2024-01-01T00:00:00.000Z'),
};

describe('calculateShares', () => {
  it('should split evenly among all participants', () => {
    const expense = {
      ...expenseBase,
      splitMode: SplitMode.EVENLY,
      paidFor: [
        { participant: p1, shares: 1 },
        { participant: p2, shares: 1 },
        { participant: p3, shares: 1 },
      ],
    };
    const shares = calculateShares(expense);
    expect(Object.values(shares).sort()).toEqual([3333, 3333, 3334]);
    expect(
      Object.entries(shares).reduce((sum, [, value]) => sum + value, 0),
    ).toBe(10000);
  });

  it('should split by amount', () => {
    const expense = {
      ...expenseBase,
      splitMode: SplitMode.BY_AMOUNT,
      paidFor: [
        { participant: p1, shares: 5000 },
        { participant: p2, shares: 2500 },
        { participant: p3, shares: 2500 },
      ],
    };
    const shares = calculateShares(expense);
    expect(shares['p1']).toBe(5000);
    expect(shares['p2']).toBe(2500);
    expect(shares['p3']).toBe(2500);
  });

  it('should split by shares', () => {
    const expense = {
      ...expenseBase,
      splitMode: SplitMode.BY_SHARES,
      paidFor: [
        { participant: p1, shares: 2 },
        { participant: p2, shares: 1 },
        { participant: p3, shares: 1 },
      ],
    };
    const shares = calculateShares(expense);
    expect(shares['p1']).toBe(5000);
    expect(shares['p2']).toBe(2500);
    expect(shares['p3']).toBe(2500);
  });

  it('should split by percentage', () => {
    const expense = {
      ...expenseBase,
      splitMode: SplitMode.BY_PERCENTAGE,
      paidFor: [
        { participant: p1, shares: 5000 }, // 50%
        { participant: p2, shares: 2500 }, // 25%
        { participant: p3, shares: 2500 }, // 25%
      ],
    };
    const shares = calculateShares(expense);
    expect(shares['p1']).toBe(5000);
    expect(shares['p2']).toBe(2500);
    expect(shares['p3']).toBe(2500);
  });

  it('should handle rounding differences by assigning the remainder to trailing participants', () => {
    const expense = {
      ...expenseBase,
      amount: 100,
      splitMode: SplitMode.EVENLY,
      paidFor: [
        { participant: p1, shares: 1 },
        { participant: p2, shares: 1 },
        { participant: p3, shares: 1 },
      ],
    };
    const shares = calculateShares(expense);
    expect(shares['p3']).toBe(34);
    expect(shares['p1']).toBe(33);
    expect(shares['p2']).toBe(33);
    expect(
      Object.entries(shares).reduce((sum, [, value]) => sum + value, 0),
    ).toBe(100);
  });

  it('should apply the same split logic for reimbursements', () => {
    const expense = {
      ...expenseBase,
      isReimbursement: true,
      splitMode: SplitMode.EVENLY,
      paidFor: [
        { participant: p2, shares: 1 },
      ],
      paidBy: p1,
    };
    const shares = calculateShares(expense);
    expect(shares['p2']).toBe(10000);
    expect(shares['p1'] ?? 0).toBe(0);
  });

  it('should include reimbursements when requesting a single participant share', () => {
    const expense = {
      ...expenseBase,
      isReimbursement: true,
      splitMode: SplitMode.EVENLY,
      paidFor: [{ participant: p2, shares: 1 }],
      paidBy: p1,
    };
    expect(calculateShare('p2', expense)).toBe(10000);
    expect(calculateShare('p1', expense)).toBe(0);
  });

  it('should handle the payer not being in the paidFor list', () => {
    const expense = {
      ...expenseBase,
      paidBy: p1,
      splitMode: SplitMode.EVENLY,
      paidFor: [
        { participant: p2, shares: 1 },
        { participant: p3, shares: 1 },
      ],
    };
    const shares = calculateShares(expense);
    expect(shares['p1'] ?? 0).toBe(0);
    expect(shares['p2']).toBe(5000);
    expect(shares['p3']).toBe(5000);
  });

  it('should distribute rounding differences deterministically even if payer changes', () => {
    const expense = {
      ...expenseBase,
      amount: 100,
      paidBy: p2,
      splitMode: SplitMode.EVENLY,
      paidFor: [
        { participant: p1, shares: 1 },
        { participant: p2, shares: 1 },
        { participant: p3, shares: 1 },
      ],
    };
    const shares = calculateShares(expense);
    expect(Object.values(shares).sort()).toEqual([33, 33, 34]);
    expect(
      Object.entries(shares).reduce((sum, [, value]) => sum + value, 0),
    ).toBe(100);
  });

  it('should handle percentages not summing to 100%', () => {
    const expense = {
      ...expenseBase,
      splitMode: SplitMode.BY_PERCENTAGE,
      paidFor: [
        { participant: p1, shares: 4000 }, // 40%
        { participant: p2, shares: 4000 }, // 40%
      ],
    };
    const shares = calculateShares(expense);
    // 80% of 10000 is 8000. Remainder is 2000. Payer (p1) gets it.
    expect(shares['p1'] + shares['p2']).toBe(10000);
    expect(shares['p1']).toBeGreaterThanOrEqual(4000);
    expect(shares['p2']).toBeGreaterThanOrEqual(4000);
  });

  it('should handle an empty paidFor list', () => {
    const expense = {
      ...expenseBase,
      splitMode: SplitMode.EVENLY,
      paidFor: [],
    };
    const shares = calculateShares(expense);
    expect(shares['p1']).toBe(10000);
  });

  it('should handle 0 total shares in BY_SHARES mode', () => {
    const expense = {
      ...expenseBase,
      splitMode: SplitMode.BY_SHARES,
      paidFor: [
        { participant: p1, shares: 0 },
        { participant: p2, shares: 0 },
      ],
    };
    const shares = calculateShares(expense);
    expect(
      Object.entries(shares).reduce((sum, [, value]) => sum + value, 0),
    ).toBe(10000);
    expect(Object.values(shares).every((value) => value >= 0)).toBe(true);
  });

  it('should handle a zero amount expense', () => {
    const expense = {
      ...expenseBase,
      amount: 0,
      splitMode: SplitMode.EVENLY,
      paidFor: [
        { participant: p1, shares: 1 },
        { participant: p2, shares: 1 },
      ],
    };
    const shares = calculateShares(expense);
    expect(shares['p1'] + 0).toBe(0); // avoid -0 vs 0
    expect(shares['p2']).toBe(0);
  });

  it('should give any leftover cents to the last participants first', () => {
    const expense = {
      ...expenseBase,
      amount: 101,
      splitMode: SplitMode.EVENLY,
      paidFor: [
        { participant: p1, shares: 1 },
        { participant: p2, shares: 1 },
        { participant: p3, shares: 1 },
      ],
    };
    const shares = calculateShares(expense);
    expect(shares['p1']).toBe(33);
    expect(shares['p2']).toBe(34);
    expect(shares['p3']).toBe(34);
    expect(Object.values(shares).reduce((sum, value) => sum + value, 0)).toBe(
      101,
    );
  });

  it('should subtract leftover cents from the end for negative expenses', () => {
    const expense = {
      ...expenseBase,
      amount: -101,
      splitMode: SplitMode.EVENLY,
      paidFor: [
        { participant: p1, shares: 1 },
        { participant: p2, shares: 1 },
        { participant: p3, shares: 1 },
      ],
    };
    const shares = calculateShares(expense);
    expect(shares['p1']).toBe(-33);
    expect(shares['p2']).toBe(-34);
    expect(shares['p3']).toBe(-34);
    expect(Object.values(shares).reduce((sum, value) => sum + value, 0)).toBe(
      -101,
    );
  });

  it('should distribute remainder in BY_AMOUNT mode if amounts do not sum up', () => {
    const expense = {
      ...expenseBase,
      amount: 10000,
      splitMode: SplitMode.BY_AMOUNT,
      paidFor: [
        { participant: p1, shares: 4000 },
        { participant: p2, shares: 4000 },
      ],
    };
    const shares = calculateShares(expense);
    const totalShares = Object.values(shares).reduce((sum, v) => sum + v, 0);
    expect(totalShares).toBe(10000);
    // p1 is the payer and should get the remainder
    expect(shares['p1']).toBe(6000);
    expect(shares['p2']).toBe(4000);
  });

  it('should handle negative expense amounts (refunds)', () => {
    const expense = {
      ...expenseBase,
      amount: -10000,
      splitMode: SplitMode.EVENLY,
      paidFor: [
        { participant: p1, shares: 1 },
        { participant: p2, shares: 1 },
      ],
    };
    const shares = calculateShares(expense);
    expect(shares['p1']).toBe(-5000);
    expect(shares['p2']).toBe(-5000);
    const totalShares = Object.values(shares).reduce((sum, v) => sum + v, 0);
    expect(totalShares).toBe(-10000);
  });

  it('should handle an undefined payer by falling back to the first participant', () => {
    const expense = {
      ...expenseBase,
      amount: 100,
      paidBy: undefined as any,
      splitMode: SplitMode.EVENLY,
      paidFor: [
        { participant: p2, shares: 1 },
        { participant: p3, shares: 1 },
      ],
    };
    const shares = calculateShares(expense);
    const totalShares = Object.values(shares).reduce((sum, v) => sum + v, 0);
    expect(totalShares).toBe(100);
    expect(shares['p2']).toBe(50);
    expect(shares['p3']).toBe(50);
  });

  it('should break ties by giving remainders to later participants (EVENLY, amount=2, 3 participants)', () => {
    const expense = {
      ...expenseBase,
      amount: 2,
      splitMode: SplitMode.EVENLY,
      paidFor: [
        { participant: p1, shares: 1 },
        { participant: p2, shares: 1 },
        { participant: p3, shares: 1 },
      ],
    };
    const shares = calculateShares(expense);
    // fractions are equal; remainder (2) should go to the last two participants
    expect(shares['p1'] + 0).toBe(0);
    expect(shares['p2']).toBe(1);
    expect(shares['p3']).toBe(1);
    expect(Object.values(shares).reduce((s, v) => s + v, 0)).toBe(2);
  });

  it('should break ties for negative amounts by subtracting from later participants first (EVENLY, amount=-2, 3 participants)', () => {
    const expense = {
      ...expenseBase,
      amount: -2,
      splitMode: SplitMode.EVENLY,
      paidFor: [
        { participant: p1, shares: 1 },
        { participant: p2, shares: 1 },
        { participant: p3, shares: 1 },
      ],
    };
    const shares = calculateShares(expense);
    expect(shares['p1'] + 0).toBe(0);
    expect(shares['p2']).toBe(-1);
    expect(shares['p3']).toBe(-1);
    expect(Object.values(shares).reduce((s, v) => s + v, 0)).toBe(-2);
  });

  it('should break ties in BY_SHARES by giving remainders to later participants (amount=2, shares equal)', () => {
    const expense = {
      ...expenseBase,
      amount: 2,
      splitMode: SplitMode.BY_SHARES,
      paidFor: [
        { participant: p1, shares: 1 },
        { participant: p2, shares: 1 },
        { participant: p3, shares: 1 },
      ],
    };
    const shares = calculateShares(expense);
    expect(shares['p1']).toBe(0);
    expect(shares['p2']).toBe(1);
    expect(shares['p3']).toBe(1);
    expect(Object.values(shares).reduce((s, v) => s + v, 0)).toBe(2);
  });

  it('should break ties in BY_PERCENTAGE by giving remainders to later participants (amount=2, equal percentages)', () => {
    const expense = {
      ...expenseBase,
      amount: 2,
      splitMode: SplitMode.BY_PERCENTAGE,
      paidFor: [
        { participant: p1, shares: 3333 },
        { participant: p2, shares: 3333 },
        { participant: p3, shares: 3333 },
      ],
    };
    const shares = calculateShares(expense);
    expect(shares['p1']).toBe(0);
    expect(shares['p2']).toBe(1);
    expect(shares['p3']).toBe(1);
    expect(Object.values(shares).reduce((s, v) => s + v, 0)).toBe(2);
  });
});
