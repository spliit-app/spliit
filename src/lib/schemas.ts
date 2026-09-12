import { RecurrenceRule, SplitMode } from '@/generated/prisma/browser'
import Decimal from 'decimal.js'

import * as z from 'zod'

export const groupFormSchema = z
  .object({
    name: z.string().min(2, 'min2').max(50, 'max50'),
    information: z.string().optional(),
    currency: z.string().min(1, 'min1').max(5, 'max5'),
    currencyCode: z.union([z.string().length(3).nullish(), z.literal('')]), // ISO-4217 currency code
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

const inputCoercedToNumber = z.union([
  z.number(),
  z.string().transform((value, ctx) => {
    const valueAsNumber = Number(value)
    if (Number.isNaN(valueAsNumber))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'invalidNumber',
      })
    return valueAsNumber
  }),
])

export const expenseFormSchema = z
  .object({
    expenseDate: z.coerce.date(),
    title: z
      .string({
        error: (issue) =>
          issue.input === undefined ? 'titleRequired' : undefined,
      })
      .min(2, 'min2'),
    category: z.coerce.number().default(0),
    amount: z
      .union(
        [
          z.number(),
          z.string().transform((value, ctx) => {
            const valueAsNumber = Number(value)
            if (Number.isNaN(valueAsNumber))
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'invalidNumber',
              })
            return valueAsNumber
          }),
        ],
        {
          error: (issue) =>
            issue.input === undefined ? 'amountRequired' : undefined,
        },
      )
      .refine((amount) => amount != 0, 'amountNotZero')
      .refine((amount) => amount <= 10_000_000_00, 'amountTenMillion'),
    originalAmount: z
      .union([
        z.literal('').transform(() => undefined),
        inputCoercedToNumber
          .refine((amount) => amount != 0, 'amountNotZero')
          .refine((amount) => amount <= 10_000_000_00, 'amountTenMillion'),
      ])
      .optional(),
    originalCurrency: z.union([z.string().length(3).nullish(), z.literal('')]),
    conversionRate: z
      .union([
        z.literal('').transform(() => undefined),
        inputCoercedToNumber.refine((amount) => amount > 0, 'ratePositive'),
      ])
      .optional(),
    paidBy: z.string({
      error: (issue) =>
        issue.input === undefined ? 'paidByRequired' : undefined,
    }),
    paidFor: z
      .array(
        z.object({
          participant: z.string(),
          originalAmount: z.string().optional(), // For converting shares by amounts in original currency, not saved.
          shares: z.union([
            z.number(),
            z.string().transform((value, ctx) => {
              const normalizedValue = value.replace(/,/g, '.')
              const valueAsNumber = Number(normalizedValue)
              if (Number.isNaN(valueAsNumber))
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: 'invalidNumber',
                })
              return value
            }),
          ]),
        }),
      )
      .min(1, 'paidForMin1')
      .superRefine((paidFor, ctx) => {
        for (const { shares } of paidFor) {
          const shareNumber = Number(shares)
          if (shareNumber <= 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'noZeroShares',
            })
          }
        }
      }),
    splitMode: z.enum(SplitMode).default('EVENLY'),
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
    recurrenceRule: z.enum(RecurrenceRule).default('NONE'),
  })
  .superRefine((expense, ctx) => {
    switch (expense.splitMode) {
      case 'EVENLY':
        break // noop
      case 'BY_SHARES':
        break // noop
      case 'BY_AMOUNT': {
        const sum = expense.paidFor.reduce((sum, { shares }) => {
          // Same normalisation as the share itself above. An emptied or
          // half-typed input is reported as an invalid share on its own; it
          // must not make the sum of the others throw.
          const value = String(shares).replace(/,/g, '.').trim()
          return value === '' || Number.isNaN(Number(value))
            ? sum
            : sum.add(value)
        }, new Decimal(0))
        if (!sum.equals(new Decimal(expense.amount))) {
          // The message names the sum and how far off it is. Issue params do
          // not survive the form resolver, so the expense form computes those
          // values itself and hands them to the message.
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'amountSum',
            path: ['paidFor'],
          })
        }
        break
      }
      case 'BY_PERCENTAGE': {
        const sum = expense.paidFor.reduce(
          (sum, { shares }) =>
            sum +
            (typeof shares === 'string'
              ? Math.round(Number(shares) * 100)
              : Number(shares)),
          0,
        )
        if (sum !== 10000) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'percentageSum',
            path: ['paidFor'],
          })
        }
        break
      }
    }
  })
  .transform((expense) => {
    // Format the share split as a number (if from form submission)
    return {
      ...expense,
      paidFor: expense.paidFor.map((paidFor) => {
        const shares = paidFor.shares
        if (typeof shares === 'string' && expense.splitMode !== 'BY_AMOUNT') {
          // For splitting not by amount, preserve the previous behaviour of multiplying the share by 100
          return {
            ...paidFor,
            shares: Math.round(Number(shares) * 100),
          }
        }
        // Otherwise, no need as the number will have been formatted according to currency.
        return {
          ...paidFor,
          shares: Number(shares),
        }
      }),
    }
  })

export type ExpenseFormValues = z.output<typeof expenseFormSchema>
// Raw form input type (before zod transforms/coercions). react-hook-form
// operates on these values; the resolver produces ExpenseFormValues on submit.
export type ExpenseFormInput = z.input<typeof expenseFormSchema>

export type SplittingOptions = {
  // Used for saving default splitting options in localStorage
  splitMode: SplitMode
  paidFor: ExpenseFormValues['paidFor'] | null
}
