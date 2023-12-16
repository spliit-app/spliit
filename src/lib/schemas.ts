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

export const expenseFormSchema = z
  .object({
    title: z
      .string({ required_error: 'Please enter a title.' })
      .min(2, 'Enter at least two characters.'),
    amount: z
      .union(
        [
          z.number(),
          z.string().transform((value, ctx) => {
            const valueAsNumber = Number(value)
            if (Number.isNaN(valueAsNumber))
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Invalid number.',
              })
            return Math.round(valueAsNumber * 100)
          }),
        ],
        { required_error: 'You must enter an amount.' },
      )
      .refine((amount) => amount >= 1, 'The amount must be higher than 0.01.')
      .refine(
        (amount) => amount <= 10_000_000_00,
        'The amount must be lower than 10,000,000.',
      ),
    paidBy: z.string({ required_error: 'You must select a participant.' }),
    paidFor: z
      .array(
        z.object({
          participant: z.string(),
          shares: z.number().int(),
        }),
      )
      .min(1, 'The expense must be paid for at least one participant.')
      .superRefine((paidFor, ctx) => {
        let sum = 0
        for (const { participant, shares } of paidFor) {
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
    isReimbursement: z.boolean(),
  })
  .superRefine((expense, ctx) => {
    let sum = 0
    for (const { participant, shares } of expense.paidFor) {
      sum += shares
    }
    switch (expense.splitMode) {
      case 'EVENLY':
        break // noop
      case 'BY_SHARES':
        break // noop
      case 'BY_AMOUNT':
        if (sum !== expense.amount) {
          const detail =
            sum < expense.amount
              ? `${expense.amount - sum} missing`
              : `${sum - expense.amount} surplus`
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Sum of amounts must equal the expense amount (${detail}).`,
            path: ['paidFor'],
          })
        }
        break
      case 'BY_PERCENTAGE':
        if (sum !== 100) {
          const detail =
            sum < 100 ? `${100 - sum}% missing` : `${sum - 100}% surplus`
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Sum of percentages must equal 100 (${detail})`,
            path: ['paidFor'],
          })
        }
        break
    }
  })

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>
