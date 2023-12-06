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

export const expenseFormSchema = z.object({
  title: z
    .string({ required_error: 'Please enter a title.' })
    .min(2, 'Enter at least two characters.'),
  amount: z.coerce
    .number({ required_error: 'You must enter an amount.' })
    .min(0.01, 'The amount must be higher than 0.01.'),
  paidBy: z.string({ required_error: 'You must select a participant.' }),
  paidFor: z
    .array(z.string())
    .min(1, 'The expense must be paid for at least 1 participant.'),
})

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>
