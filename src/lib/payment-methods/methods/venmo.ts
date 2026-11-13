import { z } from 'zod'
import { truncate } from '../format'
import type { PaymentMethodDefinition } from '../types'
import { amountText } from './shared'

// Venmo (US). Link format from venmo.com/paymentlinks, which Venmo marks as
// legacy, so it is flagged unverified.
const venmoSchema = z.object({
  type: z.literal('venmo'),
  username: z
    .string()
    .trim()
    .transform((value) => value.replace(/^@/, ''))
    .refine((value) => /^[A-Za-z0-9_-]{5,30}$/.test(value), 'invalidUsername'),
})

export const venmo: PaymentMethodDefinition<typeof venmoSchema> = {
  type: 'venmo',
  countries: ['US'],
  currencies: ['USD'],
  schema: venmoSchema,
  fields: [{ name: 'username', placeholder: '@ada-lovelace' }],
  summary: (details) => `@${details.username}`,
  instructions(details, request) {
    const note = truncate(request.note, 280)
    const params = new URLSearchParams({
      txn: 'pay',
      amount: amountText(request),
      note,
    })
    return {
      href: `https://venmo.com/${encodeURIComponent(details.username)}?${params}`,
      copy: [
        { label: 'username', value: `@${details.username}` },
        { label: 'amount', value: amountText(request) },
        { label: 'message', value: note },
      ],
      unverified: true,
    }
  },
}
