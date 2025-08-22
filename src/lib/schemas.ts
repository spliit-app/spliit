import { RecurrenceRule, SplitMode } from '@prisma/client'
import * as z from 'zod'

export const groupFormSchema = z
  .object({
    name: z.string().min(2, 'min2').max(50, 'max50'),
    information: z.string().optional(),
    currency: z.string().min(1, 'min1').max(5, 'max5'),
    participants: z
      .array(
        z.object({
          id: z.string().optional(),
          name: z.string().min(2, 'min2').max(50, 'max50'),
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
            message: 'duplicateParticipantName',
            path: ['participants', i, 'name'],
          })
        }
      })
    })
  })

export type GroupFormValues = z.infer<typeof groupFormSchema>

const amountSchema = (label: string, allowZero = false) =>
  z.union([
    z.number(),
    z.string().transform((value, ctx) => {
      const normalizedValue = value.replace(/,/g, '.')
      const valueAsNumber = Number(normalizedValue)
      if (Number.isNaN(valueAsNumber))
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'invalidNumber',
        })
      return Math.round(valueAsNumber * 100)
    }),
  ])
    .refine((amount) => (allowZero ? true : amount != 0), 'amountNotZero')
    .refine((amount) => Math.abs(Number(amount)) <= 10_000_000_00, 'amountTenMillion')

export const expenseFormSchema = z
  .object({
    expenseDate: z.coerce.date(),
    title: z.string({ required_error: 'titleRequired' }).min(2, 'min2'),
    category: z.coerce.number().default(0),
    paidBy: z
      .array(
        z.object({
          participant: z.string(),
          amount: amountSchema('amount'),
        }),
      )
      .min(1, 'paidByRequired'),
    paidFor: z
      .array(
        z.object({
          participant: z.string(),
          shares: amountSchema('shares', true),
        }),
      )
      .min(1, 'paidForMin1')
      .superRefine((paidFor, ctx) => {
        let sum = 0
        for (const { shares } of paidFor) {
          sum += shares
          if (shares < 1) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'noZeroShares',
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
    recurrenceRule: z
      .enum<RecurrenceRule, [RecurrenceRule, ...RecurrenceRule[]]>(
        Object.values(RecurrenceRule) as any,
      )
      .default('NONE'),
  })
  .transform((expense, ctx) => {
    // Determine total amount from payers
    let totalAmount = 0
    for (const { amount } of expense.paidBy) {
      totalAmount += typeof amount === 'number' ? amount : Math.round(Number(amount) * 100)
    }
    let sum = 0
    for (const { shares } of expense.paidFor) {
      sum += typeof shares === 'number' ? shares : Math.round(Number(shares) * 100)
    }
    switch (expense.splitMode) {
      case 'EVENLY':
      case 'BY_SHARES':
        break
      case 'BY_AMOUNT': {
        if (sum !== totalAmount) {
          const detail =
            sum < totalAmount
              ? `${((totalAmount - sum) / 100).toFixed(2)} missing`
              : `${((sum - totalAmount) / 100).toFixed(2)} surplus`
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'amountSum',
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
            message: 'percentageSum',
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
