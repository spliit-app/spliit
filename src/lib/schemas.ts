import { SplitMode } from '@prisma/client'
import * as z from 'zod'

export const groupFormSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Enter at least two characters.')
      .max(50, 'Enter at most 50 characters.'),
    currency: z
      .string()
      .min(1, 'Enter at least one character.')
      .max(5, 'Enter at most five characters.'),
    participants: z
      .array(
        z.object({
          id: z.string().optional(),
          name: z
            .string()
            .min(2, 'Enter at least two characters.')
            .max(50, 'Enter at most 50 characters.'),
        }),
      )
      .min(1),
  })
  .superRefine(({ participants }, ctx) => {
    participants.forEach((participant, i) => {
      participants.slice(0, i).forEach((otherParticipant) => {
        if (otherParticipant.name === participant.name) {
          ctx.addIssue({
            code: 'custom',
            message: 'Another participant already has this name.',
            path: ['participants', i, 'name'],
          })
        }
      })
    })
  })

export type GroupFormValues = z.infer<typeof groupFormSchema>

const amountSchema = (name: string, positive: boolean) =>
  z
    .union(
      [
        z.number(),
        z.string().transform((value, ctx) => {
          const normalizedValue = value.replace(/,/g, '.')
          const valueAsNumber = Number(normalizedValue)
          if (Number.isNaN(valueAsNumber))
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Invalid number.',
            })
          return Math.round(valueAsNumber * 100)
        }),
      ],
      { required_error: `${name} is required.` },
    )
    .refine((amount) => Math.abs(amount) >= 1, `${name} must not be zero.`)
    .refine((amount) => !positive || amount > 0, `${name} must be positive.`)
    .refine(
      (amount) => Math.abs(amount) <= 10_000_000_000_00,
      `${name} must be lower than 10,000,000,000.`,
    )
export const expenseFormSchema = z
  .object({
    expenseDate: z.coerce.date(),
    title: z
      .string({ required_error: 'Please enter a title.' })
      .min(2, 'Enter at least two characters.'),
    category: z.coerce.number().default(0),
    paidBy: z
      .array(
        z.object({
          key: z.string(), // Used for React list rendering
          participant: z.string({ required_error: 'Select a participant.' }),
          amount: amountSchema('The amount', false),
        }),
      )
      .min(1, 'The expense must be paid by at least one participant.')
      .superRefine((paidBy, ctx) => {
        let sum = 0
        let ids = new Set<string>()
        for (const { participant, amount } of paidBy) {
          sum += amount
          if (ids.has(participant)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'The same participant is selected multiple times.',
            })
          } else {
            ids.add(participant)
          }
        }
      }),
    paidFor: z
      .array(
        z.object({
          participant: z.string(),
          shares: amountSchema('The share', true),
        }),
      )
      .min(1, 'The expense must be paid for at least one participant.')
      .superRefine((paidFor, ctx) => {
        let sum = 0
        for (const { shares } of paidFor) {
          sum += shares
          if (shares < 1) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'All shares must be higher than 0.',
            })
          }
        }
      }),
    splitMode: z
      .enum<SplitMode, [SplitMode, ...SplitMode[]]>(
        Object.values(SplitMode) as any,
      )
      .default('EVENLY'),
    saveDefaultSplittingOptions: z.boolean(),
    isReimbursement: z.boolean(),
    documents: z
      .array(
        z.object({
          id: z.string(),
          url: z.string().url(),
          width: z.number().int().min(1),
          height: z.number().int().min(1),
        }),
      )
      .default([]),
    notes: z.string().optional(),
  })
  .transform((expense, ctx) => {
    // Determine total amount
    let totalAmount = 0
    for (const { amount } of expense.paidBy) {
      totalAmount +=
        typeof amount === 'number' ? amount : Math.round(Number(amount) * 100)
    }
    // Check sum of paidFor shares
    let sum = 0
    for (const { shares } of expense.paidFor) {
      sum +=
        typeof shares === 'number' ? shares : Math.round(Number(shares) * 100)
    }
    switch (expense.splitMode) {
      case 'EVENLY':
        break // noop
      case 'BY_SHARES':
        break // noop
      case 'BY_AMOUNT': {
        if (sum !== totalAmount) {
          const detail =
            sum < totalAmount
              ? `${((totalAmount - sum) / 100).toFixed(2)} missing`
              : `${((sum - totalAmount) / 100).toFixed(2)} surplus`
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Sum of amounts must equal the expense amount (${detail}).`,
            path: ['paidFor'],
          })
        }
        break
      }
      case 'BY_PERCENTAGE': {
        if (sum !== 10000) {
          const detail =
            sum < 10000
              ? `${((10000 - sum) / 100).toFixed(0)}% missing`
              : `${((sum - 10000) / 100).toFixed(0)}% surplus`
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Sum of percentages must equal 100 (${detail})`,
            path: ['paidFor'],
          })
        }
        break
      }
    }
    return { amount: totalAmount, ...expense }
  })

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>

export type SplittingOptions = {
  // Used for saving default splitting options in localStorage
  splitMode: SplitMode
  paidFor: ExpenseFormValues['paidFor'] | null
}
