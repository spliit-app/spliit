import { SplitwiseExportLanguage } from './header-detection'

export type Shares = Record<string, number>
export type Deltas = Record<string, number>

export type ReimbursementModel = {
  description: string
  payer: string
  receiver: string
  amountC: number
}

export type GroupExpenseModel = {
  description: string
  payer: string
  participants: string[]
  totalC: number
  sharesC: Shares
}

export type ParsedRowModel = {
  groupExpenses: GroupExpenseModel[]
  reimbursements: ReimbursementModel[]
}

const REIMBURSEMENT_TEMPLATES: Record<string, string> = {
  de: '{payer} zahlt {receiver}',
  en: '{payer} pays {receiver}',
  fr: '{payer} paie {receiver}',
  es: '{payer} paga a {receiver}',
}

export const formatReimbursementTitle = (
  payerName: string,
  receiverName: string,
  language: SplitwiseExportLanguage,
): string => {
  const langKey = language === 'unknown' ? 'en' : language
  const template =
    REIMBURSEMENT_TEMPLATES[langKey] ?? REIMBURSEMENT_TEMPLATES['en']

  return template
    .replace('{payer}', payerName)
    .replace('{receiver}', receiverName)
}

// Allow tiny rounding drift in participant deltas (in cents).
const MAX_DELTA_DRIFT_CENTS = 1

export const parseExportRow = (
  description: string,
  isPaymentCategory: boolean,
  totalC: number,
  participants: string[],
  deltasC: Deltas,
): ParsedRowModel => {
  // 1) Validate and fix drift
  let sumDeltas = participants.reduce((s, p) => s + (deltasC[p] ?? 0), 0)
  if (sumDeltas !== 0) {
    const drift = sumDeltas
    const driftAbs = Math.abs(drift)
    if (driftAbs <= MAX_DELTA_DRIFT_CENTS && participants.length > 0) {
      const first = participants[0]
      if (first) {
        deltasC[first] = (deltasC[first] ?? 0) - drift
        sumDeltas = 0
      }
    }
  }

  if (sumDeltas !== 0) {
    throw new Error(
      `sum(deltas) != 0 (${sumDeltas}); row is inconsistent even after drift correction`,
    )
  }

  // 2) Reimbursements
  if (isPaymentCategory) {
    return {
      groupExpenses: [],
      reimbursements: decomposeDeltasToReimbursements(
        description,
        participants,
        deltasC,
      ),
    }
  }

  // 3) Group Expenses
  if (totalC <= 0) {
    // If total is 0 or negative (but not payment), ignoring it or treating as error?
    // Splitwise shouldn't export expenses with 0 cost usually, but if it does, it's a no-op.
    throw new Error('totalC must be positive for Splitwise rows')
  }

  // Reconstruction Strategy:
  // We need to determine (Payer, Amount, Shares) tuples that explain the Deltas.
  // We assume:
  // - "Equal Split" is the most likely intent if mathematically possible.
  // - Otherwise, we fall back to a "Robust" distribution that minimizes the number of payers.

  const { payments, shares } = reconstructPaymentsAndShares(
    totalC,
    participants,
    deltasC,
  )

  const groupExpenses: GroupExpenseModel[] = []

  // Create one expense per payer
  for (const payer of participants) {
    const payAmt = payments[payer] ?? 0
    if (payAmt > 0) {
      // Distribute shares for this expense.
      // We have global target shares `shares[p]`.
      // We need to allocate `payAmt` to shares such that we respect the global target.
      // Since we might have multiple expenses (payers), we need to coordinate.
      // A simple greedy allocation works because shares are fungible.
      const expenseShares: Shares = {}
      let remaining = payAmt

      for (const p of participants) {
        if (remaining <= 0) break
        const target = shares[p] ?? 0
        if (target > 0) {
          const take = Math.min(remaining, target)
          expenseShares[p] = take
          shares[p] = target - take
          remaining -= take
        }
      }

      // If we still have remaining amount (rounding errors or unallocated), dump it on the payer
      if (remaining > 0) {
        expenseShares[payer] = (expenseShares[payer] ?? 0) + remaining
      }

      groupExpenses.push({
        description,
        payer,
        participants,
        totalC: payAmt,
        sharesC: filterZeroShares(expenseShares),
      })
    }
  }

  return { groupExpenses, reimbursements: [] }
}

const filterZeroShares = (shares: Shares): Shares => {
  const result: Shares = {}
  for (const [k, v] of Object.entries(shares)) {
    if (v > 0) result[k] = v
  }
  return result
}

// Decompose deltas into simple Payer -> Receiver flows.
const decomposeDeltasToReimbursements = (
  description: string,
  participants: string[],
  deltasC: Deltas,
): ReimbursementModel[] => {
  const positives: Array<[string, number]> = []
  const negatives: Array<[string, number]> = []
  for (const p of participants) {
    const d = deltasC[p] ?? 0
    if (d > 0) positives.push([p, d])
    else if (d < 0) negatives.push([p, -d])
  }

  const reimbursements: ReimbursementModel[] = []
  let i = 0
  let j = 0

  while (i < positives.length && j < negatives.length) {
    const posEntry = positives[i]
    const negEntry = negatives[j]
    if (!posEntry || !negEntry) break

    let [payer, budget] = posEntry
    let [recv, need] = negEntry
    const amt = Math.min(budget, need)
    if (amt > 0) {
      reimbursements.push({
        description,
        payer,
        receiver: recv,
        amountC: amt,
      })
      budget -= amt
      need -= amt
    }

    if (budget === 0) i += 1
    else positives[i] = [payer, budget]

    if (need === 0) j += 1
    else negatives[j] = [recv, need]
  }

  return reimbursements
}

const reconstructPaymentsAndShares = (
  totalC: number,

  participants: string[],

  deltasC: Deltas,
): { payments: Shares; shares: Shares } => {
  const N = participants.length

  if (N === 0) return { payments: {}, shares: {} }

  // 0. Identify Max Delta and Sum of Positive Deltas

  let maxDelta = -Infinity

  let primaryPayer = participants[0]

  let sumPos = 0

  for (const p of participants) {
    const d = deltasC[p] ?? 0

    if (d > maxDelta) {
      maxDelta = d

      primaryPayer = p
    }

    if (d > 0) {
      sumPos += d
    }
  }

  // 1. Special Case: All Deltas are Zero (Self-Payment)

  if (
    participants.length > 0 &&
    participants.every((p) => (deltasC[p] ?? 0) === 0)
  ) {
    const payments: Shares = {}

    const shares: Shares = {}

    const base = Math.floor(totalC / N)

    let rem = totalC % N

    for (const p of participants) {
      const amt = base + (rem > 0 ? 1 : 0)

      payments[p] = amt

      shares[p] = amt

      if (rem > 0) rem--
    }

    return { payments, shares }
  }

  // 2. Try Single Payer Hypothesis

  // Assume Primary Payer paid everything.

  // P_primary = Total. P_others = 0.

  // S_i = P_i - D_i

  // Valid if all S_i >= 0.

  let singlePayerPossible = true

  const singlePayerShares: Shares = {}

  for (const p of participants) {
    const pay = p === primaryPayer ? totalC : 0

    const d = deltasC[p] ?? 0

    const s = pay - d

    if (s < 0) {
      singlePayerPossible = false

      break
    }

    singlePayerShares[p] = s
  }

  if (singlePayerPossible) {
    const payments: Shares = {}

    payments[primaryPayer] = totalC

    return { payments, shares: singlePayerShares }
  }

  // 2. Try Equal Split Hypothesis

  // Assume Shares are roughly Total / N.

  // P_i = S_i + D_i

  // If we can find non-negative P_i that sum to Total, we accept this.

  const equalBase = Math.floor(totalC / N)

  let remainder = totalC % N

  const equalPayments: Shares = {}

  let equalPossible = true

  const equalShares: Shares = {}

  for (const p of participants) {
    equalShares[p] = equalBase
  }

  // Distribute share remainder

  for (let i = 0; i < remainder; i++) {
    equalShares[participants[i]]! += 1
  }

  // Calculate implied payments

  for (const p of participants) {
    const s = equalShares[p]!

    const d = deltasC[p] ?? 0

    const pImplied = s + d

    if (pImplied < 0) {
      equalPossible = false

      break
    }

    equalPayments[p] = pImplied
  }

  if (equalPossible) {
    return { payments: equalPayments, shares: equalShares }
  }

  // 3. Fallback: Robust "Primary Payer" Model

  // Consolidate payments to the person with max positive Delta (Primary Lender).

  // Distribute rest as needed.

  // P_i = D_i (if D_i > 0)

  // P_primary += (Total - SumPos)

  // S_i = P_i - D_i

  const payments: Shares = {}

  const shares: Shares = {}

  for (const p of participants) {
    const d = deltasC[p] ?? 0

    if (d > 0) {
      payments[p] = d
    } else {
      payments[p] = 0
    }
  }

  const unallocatedCost = totalC - sumPos

  // Assign unallocated cost to primary payer

  if (primaryPayer) {
    payments[primaryPayer] = (payments[primaryPayer] ?? 0) + unallocatedCost
  }

  // Calculate Shares

  for (const p of participants) {
    const pay = payments[p] ?? 0

    const d = deltasC[p] ?? 0

    const s = pay - d

    shares[p] = s
  }

  return { payments, shares }
}
