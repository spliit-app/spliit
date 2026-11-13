import { z } from 'zod'
import { truncate } from '../format'
import type { PaymentMethodDefinition } from '../types'
import { amountText } from './shared'

// Revolut.me profile link. It does not take an amount, so the amount is copied.
const revolutSchema = z.object({
  type: z.literal('revolut'),
  username: z
    .string()
    .trim()
    .transform((value) =>
      value
        .replace(/^(https?:\/\/)?(www\.)?revolut\.me\//i, '')
        .replace(/^@/, ''),
    )
    .refine((value) => /^[A-Za-z0-9._-]{3,32}$/.test(value), 'invalidUsername'),
})

export const revolut: PaymentMethodDefinition<typeof revolutSchema> = {
  type: 'revolut',
  countries: [],
  currencies: 'any',
  schema: revolutSchema,
  fields: [{ name: 'username', placeholder: 'adalovelace' }],
  summary: (details) => `@${details.username}`,
  instructions(details, request) {
    return {
      href: `https://revolut.me/${encodeURIComponent(details.username)}`,
      copy: [
        { label: 'username', value: `@${details.username}` },
        { label: 'amount', value: amountText(request) },
        { label: 'message', value: truncate(request.note, 140) },
      ],
    }
  },
}
