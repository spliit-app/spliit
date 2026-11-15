import { RecurrenceRule, SplitMode } from '@/generated/prisma/browser'
import * as z from 'zod'

const id = z.string().min(1).max(64)
const participantId = id
const expenseId = id

const dateOnly = z.iso.date()
const dateInput = z
  .union([dateOnly, z.iso.datetime({ offset: true })])
  .transform((value) => new Date(value).toISOString().slice(0, 10))
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Invalid month')

const amount = z
  .number()
  .int()
  .min(-1_000_000_000)
  .max(1_000_000_000)
  .refine((value) => value !== 0, 'Amount must be non-zero')

const positiveAmount = z.number().int().positive().max(1_000_000_000)

const currency = z.string().min(1).max(5)
const currencyCode = z.string().length(3).nullish()

const rateInput = z.union([
  z.number().positive(),
  z
    .string()
    .regex(/^\d+(?:\.\d+)?$/)
    .transform(Number),
])

const paidByInput = z.union([
  participantId,
  z.object({ id: participantId }).transform((value) => value.id),
])

const participantName = z.string().min(2).max(50)
const documentSchema = z.object({
  id: z.string().min(1).max(64),
  url: z.string().url().max(2000),
  width: z.number().int().min(1),
  height: z.number().int().min(1),
})

export const paidForEntrySchema = z.object({
  participantId,
  shares: z.number().positive().optional(),
})

const paidForList = z
  .array(paidForEntrySchema)
  .min(1)
  .max(100)
  .superRefine((entries, ctx) => {
    const seen = new Set<string>()
    entries.forEach((entry, index) => {
      if (seen.has(entry.participantId))
        ctx.addIssue({
          code: 'custom',
          message: 'Duplicate participant in paidFor',
          path: [index, 'participantId'],
        })
      seen.add(entry.participantId)
    })
  })

export type PaidForEntryInput = z.infer<typeof paidForEntrySchema>

export const groupsUpdateSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  information: z.string().max(10_000).optional(),
  currency: currency.optional(),
  currencyCode: currencyCode.optional(),
  participants: z
    .array(
      z.object({
        id: z.string().min(1).max(64).optional(),
        name: participantName,
      }),
    )
    .min(1)
    .max(100)
    .optional(),
  participantId: participantId.optional(),
})

export type GroupsUpdateInput = z.infer<typeof groupsUpdateSchema>

export const participantsAddSchema = z.object({
  name: participantName,
})

export type ParticipantsAddInput = z.infer<typeof participantsAddSchema>

export const participantsRenameSchema = z.object({
  participantId,
  name: participantName,
})

export type ParticipantsRenameInput = z.infer<typeof participantsRenameSchema>

export const participantsRemoveSchema = z.object({
  participantId,
  confirm: z.literal(true),
})

export type ParticipantsRemoveInput = z.infer<typeof participantsRemoveSchema>

export const expensesCreateSchema = z.object({
  title: z.string().min(2).max(200),
  amount,
  expenseDate: dateInput.optional(),
  categoryId: z.number().int().min(0).optional(),
  paidBy: paidByInput,
  paidFor: paidForList.optional(),
  splitMode: z.enum(SplitMode).default('EVENLY'),
  isReimbursement: z.boolean().default(false),
  notes: z.string().max(5_000).optional(),
  originalAmount: positiveAmount.optional(),
  originalCurrency: z.string().length(3).optional(),
  conversionRate: rateInput.optional(),
  recurrenceRule: z.enum(RecurrenceRule).default('NONE'),
  documents: z.array(documentSchema).max(100).optional(),
  participantId: participantId.optional(),
})

export type ExpensesCreateInput = z.infer<typeof expensesCreateSchema>

export const expensesUpdateSchema = expensesCreateSchema
  .omit({
    title: true,
    amount: true,
    paidBy: true,
  })
  .extend({
    expenseId,
    title: z.string().min(2).max(200).optional(),
    amount: amount.optional(),
    paidBy: paidByInput.optional(),
    splitMode: z.enum(SplitMode).optional(),
    isReimbursement: z.boolean().optional(),
    recurrenceRule: z.enum(RecurrenceRule).optional(),
    notes: z.string().max(5_000).nullish(),
    originalAmount: positiveAmount.nullish(),
    originalCurrency: z.string().length(3).nullish(),
    conversionRate: rateInput.nullish(),
  })

export type ExpensesUpdateInput = z.infer<typeof expensesUpdateSchema>

export const groupsGetSchema = z.object({})
export const groupsDeleteSchema = z.object({
  groupName: z.string().min(2).max(50),
})
export const groupsRestoreSchema = z.object({})
export const groupsExportSchema = z.object({})

export const expensesListSchema = z.object({
  filter: z.string().max(200).optional(),
  cursor: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(100).default(20),
})

export const expensesGetSchema = z.object({ expenseId })
export const expensesDeleteSchema = z.object({ expenseId })

export const balancesGetSchema = z.object({})

export const balancesSettleSchema = z.object({
  from: participantId,
  to: participantId,
  amount: positiveAmount.optional(),
  confirm: z.literal(true),
})

export type BalancesSettleInput = z.infer<typeof balancesSettleSchema>

export const expensesAggregateSchema = z.object({
  from: dateOnly.optional(),
  to: dateOnly.optional(),
  categoryId: z.number().int().min(0).optional(),
  participantId: participantId.optional(),
  role: z.enum(['payer', 'share']).default('payer'),
  filter: z.string().max(200).optional(),
  groupBy: z.enum(['none', 'category', 'participant', 'month']).default('none'),
  includeReimbursements: z.boolean().default(false),
})

export type ExpensesAggregateInput = z.infer<typeof expensesAggregateSchema>

export const statsOverviewSchema = z.object({
  participantId: participantId.optional(),
  from: dateOnly.optional(),
  to: dateOnly.optional(),
})

export const statsMonthExpensesSchema = z.object({
  month,
  from: dateOnly.optional(),
  to: dateOnly.optional(),
})

export const statsCategoryExpensesSchema = z.object({
  categoryId: z.number().int().min(0),
  from: dateOnly.optional(),
  to: dateOnly.optional(),
})

export const activitiesListSchema = z.object({
  cursor: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(100).default(5),
})

export const categoriesListSchema = z.object({})
