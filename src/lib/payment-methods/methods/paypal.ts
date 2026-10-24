import { z } from 'zod'
import { truncate } from '../format'
import type { PaymentMethodDefinition } from '../types'
import { amountText } from './shared'

// PayPal.me: https://paypal.me/{name}/{amount}{currency}
const paypalSchema = z.object({
  type: z.literal('paypal'),
  username: z
    .string()
    .trim()
    .transform((value) =>
      value.replace(/^(https?:\/\/)?(www\.)?paypal\.me\//i, ''),
    )
    .refine((value) => /^[A-Za-z0-9]{1,20}$/.test(value), 'invalidUsername'),
})

export const paypal: PaymentMethodDefinition<typeof paypalSchema> = {
  type: 'paypal',
  countries: [],
  currencies: 'any',
  schema: paypalSchema,
  fields: [{ name: 'username', placeholder: 'adalovelace' }],
  summary: (details) => `paypal.me/${details.username}`,
  instructions(details, request) {
    const base = `https://paypal.me/${encodeURIComponent(details.username)}`
    // Without an ISO code PayPal cannot prefill the amount.
    const href = request.currency.code
      ? `${base}/${amountText(request)}${request.currency.code}`
      : base
    return {
      href,
      copy: [
        { label: 'username', value: details.username },
        { label: 'amount', value: amountText(request) },
        { label: 'message', value: truncate(request.note, 140) },
      ],
    }
  },
}
