import { SplitMode } from '@/generated/prisma/browser'
import { z } from 'zod'

export const defaultSplittingOptionsSchema = z
  .object({
    splitMode: z.enum(SplitMode),
    paidFor: z
      .array(
        z.object({
          participant: z.string().min(1).max(64),
          shares: z.number().int().positive(),
        }),
      )
      .min(1)
      .max(100)
      .nullable(),
  })
  .superRefine(({ splitMode, paidFor }, ctx) => {
    if ((splitMode === 'BY_AMOUNT') !== (paidFor === null)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Invalid participants for split mode',
      })
    }
    if (!paidFor) return
    if (
      new Set(paidFor.map(({ participant }) => participant)).size !==
      paidFor.length
    ) {
      ctx.addIssue({ code: 'custom', message: 'Duplicate participants' })
    }
    if (
      splitMode === 'BY_PERCENTAGE' &&
      paidFor.reduce((sum, { shares }) => sum + shares, 0) !== 10000
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Percentages must add up to 100%',
      })
    }
  })

export function hasOnlyGroupParticipants(
  paidFor: { participant: string }[] | null,
  participantIds: readonly string[],
) {
  const members = new Set(participantIds)
  return (
    paidFor === null ||
    paidFor.every(({ participant }) => members.has(participant))
  )
}
