import {
  getPublicBalances,
  getSuggestedReimbursements,
  type Balances,
} from './balances'

describe('getSuggestedReimbursements', () => {
  it('creates a single reimbursement for one debtor/creditor', () => {
    const balances: Balances = {
      a: { paid: 0, paidFor: 0, total: 50 },
      b: { paid: 0, paidFor: 0, total: -50 },
    }

    expect(getSuggestedReimbursements(balances)).toEqual([
      { from: 'b', to: 'a', amount: 50 },
    ])
  })

  it('settles multiple creditors from one debtor', () => {
    const balances: Balances = {
      a: { paid: 0, paidFor: 0, total: 30 },
      b: { paid: 0, paidFor: 0, total: 20 },
      c: { paid: 0, paidFor: 0, total: -50 },
    }

    expect(getSuggestedReimbursements(balances)).toEqual([
      { from: 'c', to: 'a', amount: 30 },
      { from: 'c', to: 'b', amount: 20 },
    ])
  })

  it('settles one creditor from multiple debtors in stable order', () => {
    const balances: Balances = {
      a: { paid: 0, paidFor: 0, total: 100 },
      b: { paid: 0, paidFor: 0, total: -60 },
      c: { paid: 0, paidFor: 0, total: -40 },
    }

    expect(getSuggestedReimbursements(balances)).toEqual([
      { from: 'c', to: 'a', amount: 40 },
      { from: 'b', to: 'a', amount: 60 },
    ])
  })

  it('filters reimbursements that round to zero', () => {
    const balances: Balances = {
      a: { paid: 0, paidFor: 0, total: 0.4 },
      b: { paid: 0, paidFor: 0, total: -0.4 },
    }

    expect(getSuggestedReimbursements(balances)).toEqual([])
  })

  it('public balances match reimbursement net totals', () => {
    const balances: Balances = {
      a: { paid: 0, paidFor: 0, total: 30 },
      b: { paid: 0, paidFor: 0, total: 20 },
      c: { paid: 0, paidFor: 0, total: -50 },
      z: { paid: 0, paidFor: 0, total: 0 },
    }

    const reimbursements = getSuggestedReimbursements(balances)
    const publicBalances = getPublicBalances(reimbursements)

    expect(reimbursements).toEqual([
      { from: 'c', to: 'a', amount: 30 },
      { from: 'c', to: 'b', amount: 20 },
    ])

    expect(publicBalances).toEqual({
      a: { paid: 30, paidFor: 0, total: 30 },
      b: { paid: 20, paidFor: 0, total: 20 },
      c: { paid: 0, paidFor: 50, total: -50 },
    })
  })

  it('handles balanced group (all balances zero)', () => {
    const balances: Balances = {
      a: { paid: 0, paidFor: 0, total: 0 },
      b: { paid: 0, paidFor: 0, total: 0 },
      c: { paid: 0, paidFor: 0, total: 0 },
    }

    expect(getSuggestedReimbursements(balances)).toEqual([])
  })

  it('sorting ensures stable reimbursement suggestions', () => {
    // Test that positive balances come before negative balances,
    // and within same sign, participants are sorted by ID
    const balances: Balances = {
      z: { paid: 0, paidFor: 0, total: 50 }, // creditor
      a: { paid: 0, paidFor: 0, total: 30 }, // creditor
      m: { paid: 0, paidFor: 0, total: -40 }, // debtor
      b: { paid: 0, paidFor: 0, total: -40 }, // debtor
    }

    // With stable sorting by ID within same sign:
    // Sorted: [a: 30, z: 50] [b: -40, m: -40]
    // Greedy pairing (first creditor ↔ last debtor):
    // 1. a(30) ↔ m(-40): a pays 30, m owes 10 remaining
    // 2. z(50) ↔ m(-10): z gets 10, m settled, z has 40 remaining
    // 3. z(40) ↔ b(-40): z gets 40, b settled
    const reimbursements = getSuggestedReimbursements(balances)

    expect(reimbursements).toEqual([
      { from: 'm', to: 'a', amount: 30 },
      { from: 'm', to: 'z', amount: 10 },
      { from: 'b', to: 'z', amount: 40 },
    ])
  })
})
