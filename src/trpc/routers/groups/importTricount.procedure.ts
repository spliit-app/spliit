import { randomId } from '@/lib/api'
import { getCurrency } from '@/lib/currency'
import { prisma } from '@/lib/prisma'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

const rateCache = new Map<string, number>()

async function getExchangeRate(
  date: Date,
  base: string,
  target: string,
): Promise<number> {
  const dateString = date.toISOString().split('T')[0]
  try {
    const res = await fetch(
      `https://api.frankfurter.app/${dateString}?base=${base}&symbols=${target}`,
    )
    if (res.ok) {
      const data = (await res.json()) as any
      if (data.rates && data.rates[target]) {
        return data.rates[target]
      }
    }
  } catch (e) {
    // ignore
  }
  return 1
}

async function getRate(
  date: Date,
  base: string,
  target: string,
): Promise<number> {
  const dateString = date.toISOString().split('T')[0]
  const cacheKey = `${dateString}_${base}_${target}`
  if (rateCache.has(cacheKey)) {
    return rateCache.get(cacheKey)!
  }
  const rate = await getExchangeRate(date, base, target)
  rateCache.set(cacheKey, rate)
  return rate
}

function parseCSV(text: string): string[][] {
  const lines: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i]
    const nextChar = cleanText[i + 1]

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        row.push(field)
        field = ''
      } else if (char === '\n') {
        row.push(field)
        lines.push(row)
        row = []
        field = ''
      } else {
        field += char
      }
    }
  }
  if (field || row.length > 0) {
    row.push(field)
    lines.push(row)
  }
  return lines.filter((r) => r.length > 0)
}

export const importTricountProcedure = baseProcedure
  .input(
    z.object({
      csvText: z.string(),
      targetCurrencyCode: z.string().length(3),
    }),
  )
  .mutation(async ({ input: { csvText, targetCurrencyCode } }) => {
    const rows = parseCSV(csvText)
    if (rows.length < 2) {
      throw new Error('CSV file is empty or invalid')
    }
    const headers = rows[0]

    const titleIdx = headers.indexOf('Title')
    const amountIdx = headers.indexOf('Amount')
    const currencyIdx = headers.indexOf('Currency')
    const exchangeRateIdx = headers.indexOf('Exchange rate')
    const amountInDefaultIdx = headers.findIndex((h) =>
      h.startsWith('Amount in default currency'),
    )
    const transactionTypeIdx = headers.indexOf('Transaction type')
    const categoryIdx = headers.indexOf('Category')
    const paidByIdx = headers.indexOf('Paid by')
    const dateTimeIdx = headers.indexOf('Date & time')

    if (
      titleIdx === -1 ||
      amountIdx === -1 ||
      currencyIdx === -1 ||
      paidByIdx === -1
    ) {
      throw new Error('Invalid Tricount CSV format: missing required columns')
    }

    let defaultCurrencyCode = 'EUR'
    if (amountInDefaultIdx !== -1) {
      const match = headers[amountInDefaultIdx].match(/\(([^)]+)\)/)
      if (match) {
        defaultCurrencyCode = match[1]
      }
    }

    const participantNames: string[] = []
    const participantMap = new Map<
      string,
      { paidByIdx: number; impactedIdx: number }
    >()

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i]
      if (header.startsWith('Paid by ') && header !== 'Paid by') {
        const name = header.substring('Paid by '.length).trim()
        if (name) {
          if (!participantMap.has(name)) {
            participantMap.set(name, { paidByIdx: -1, impactedIdx: -1 })
          }
          participantMap.get(name)!.paidByIdx = i
          if (!participantNames.includes(name)) participantNames.push(name)
        }
      } else if (header.startsWith('Impacted to ')) {
        const name = header.substring('Impacted to '.length).trim()
        if (name) {
          if (!participantMap.has(name)) {
            participantMap.set(name, { paidByIdx: -1, impactedIdx: -1 })
          }
          participantMap.get(name)!.impactedIdx = i
          if (!participantNames.includes(name)) participantNames.push(name)
        }
      }
    }

    if (participantNames.length === 0) {
      throw new Error('No participants found in the Tricount CSV')
    }

    let groupName = 'Imported Tricount Group'
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i] && rows[i].length > 0) {
        const cell = rows[i][0]
        const groupNameMatch = cell.match(/^tricount (.*) - Exported on /)
        if (groupNameMatch) {
          groupName = groupNameMatch[1]
          break
        }
      }
    }

    const targetCurrency = getCurrency(targetCurrencyCode)

    const result = await prisma.$transaction(async (tx) => {
      const groupId = randomId()
      const dbCategories = await tx.category.findMany()

      // Create Group
      const group = await tx.group.create({
        data: {
          id: groupId,
          name: groupName,
          currency: targetCurrency.symbol || '$',
          currencyCode: targetCurrencyCode,
          participants: {
            createMany: {
              data: participantNames.map((name) => ({
                id: randomId(),
                name,
              })),
            },
          },
        },
        include: { participants: true },
      })

      // Map participant name -> db id
      const participantDbIds = new Map<string, string>()
      for (const p of group.participants) {
        participantDbIds.set(p.name, p.id)
      }

      // Helper for categories
      const findCategoryId = (
        tricountCategory: string,
        isReimbursement: boolean,
      ) => {
        if (isReimbursement) return 1 // Payment category
        const normalized = tricountCategory.toLowerCase().trim()
        if (normalized === 'no category') return 0 // General category
        const match = dbCategories.find(
          (c) =>
            c.name.toLowerCase() === normalized ||
            c.grouping.toLowerCase() === normalized,
        )
        return match ? match.id : 0
      }

      // Parse expenses
      for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex]
        if (row.length < 8) continue // Skip invalid/short rows
        if (row[0].startsWith('tricount ') && row[0].includes(' - Exported on'))
          continue

        const title = row[titleIdx] || 'Untitled'
        const amountStr = row[amountIdx]
        const currencyStr = row[currencyIdx]
        const exchangeRateStr = row[exchangeRateIdx]
        const amountInDefaultStr =
          amountInDefaultIdx !== -1 ? row[amountInDefaultIdx] : amountStr

        if (!amountStr || isNaN(parseFloat(amountStr))) continue

        const amountOriginalVal = parseFloat(amountStr)
        const amountDefaultVal = parseFloat(amountInDefaultStr || amountStr)
        const isReimbursement =
          title.toLowerCase().includes('recouvrement de dette') ||
          title.toLowerCase().includes('repayment') ||
          title.toLowerCase().includes('reimbursement') ||
          title.toLowerCase().includes('transfer') ||
          title.toLowerCase().includes('settlement')

        const categoryName = categoryIdx !== -1 ? row[categoryIdx] : ''
        const categoryId = findCategoryId(categoryName, isReimbursement)

        const paidBy = row[paidByIdx]
        const paidById = participantDbIds.get(paidBy)
        if (!paidById) continue // Skip if payer not found

        let expenseDate = new Date()
        if (dateTimeIdx !== -1 && row[dateTimeIdx]) {
          try {
            const parsedDate = new Date(row[dateTimeIdx])
            if (!isNaN(parsedDate.getTime())) {
              expenseDate = parsedDate
            }
          } catch (e) {}
        }

        // Find exchange rate targetCurrencyCode -> defaultCurrencyCode
        let targetToDefaultRate = 1
        if (targetCurrencyCode !== defaultCurrencyCode) {
          let foundRate = false
          for (let i = 1; i < rows.length; i++) {
            const r = rows[i]
            if (r.length >= 8 && r[currencyIdx] === targetCurrencyCode) {
              const rate = parseFloat(r[exchangeRateIdx])
              if (rate && !isNaN(rate)) {
                targetToDefaultRate = rate
                foundRate = true
                break
              }
            }
          }
          if (!foundRate) {
            targetToDefaultRate = await getRate(
              expenseDate,
              targetCurrencyCode,
              defaultCurrencyCode,
            )
          }
        }

        const targetCurrencyDigits = targetCurrency.decimal_digits ?? 2
        let amountCents = 0
        let originalAmountCents: number | null = null
        let originalCurrencyCode: string | null = null
        let conversionRateVal: number | null = null

        if (currencyStr === targetCurrencyCode) {
          amountCents = Math.round(
            amountOriginalVal * 10 ** targetCurrencyDigits,
          )
        } else {
          const amountTargetVal = amountDefaultVal / targetToDefaultRate
          amountCents = Math.round(amountTargetVal * 10 ** targetCurrencyDigits)

          const origCurrency = getCurrency(currencyStr)
          originalAmountCents = Math.round(
            amountOriginalVal * 10 ** (origCurrency.decimal_digits ?? 2),
          )
          originalCurrencyCode = currencyStr
          conversionRateVal = amountTargetVal / amountOriginalVal
        }

        // Build paidFor list (participants with non-zero impact)
        const paidForList: { participantId: string; shares: number }[] = []
        let sumShares = 0

        for (const name of participantNames) {
          const pMap = participantMap.get(name)!
          if (pMap.impactedIdx !== -1 && row[pMap.impactedIdx]) {
            const impactedVal = parseFloat(row[pMap.impactedIdx])
            if (impactedVal < 0) {
              const impactedTargetVal =
                Math.abs(impactedVal) / targetToDefaultRate
              const shareAmount = Math.round(
                impactedTargetVal * 10 ** targetCurrencyDigits,
              )
              if (shareAmount > 0) {
                paidForList.push({
                  participantId: participantDbIds.get(name)!,
                  shares: shareAmount,
                })
                sumShares += shareAmount
              }
            }
          }
        }

        // Adjust discrepancy if any
        const discrepancy = amountCents - sumShares
        if (discrepancy !== 0 && paidForList.length > 0) {
          paidForList[paidForList.length - 1].shares += discrepancy
        }

        // If no one is impacted, default to the payer themselves.
        if (paidForList.length === 0) {
          paidForList.push({
            participantId: paidById,
            shares: amountCents,
          })
        }

        const expenseId = randomId()
        await tx.expense.create({
          data: {
            id: expenseId,
            groupId,
            expenseDate,
            categoryId,
            amount: amountCents,
            originalAmount: originalAmountCents,
            originalCurrency: originalCurrencyCode,
            conversionRate: conversionRateVal,
            title,
            paidById,
            splitMode: 'BY_AMOUNT',
            isReimbursement,
            paidFor: {
              createMany: {
                data: paidForList,
              },
            },
          },
        })
      }

      return { groupId }
    })

    return result
  })
