import { z } from 'zod'
import { maskTail, truncate } from '../format'
import type { PaymentMethodDefinition } from '../types'
import { amountText, phoneField } from './shared'

// MobilePay (Finland, Denmark): no public person-to-person pay link either.
const mobilepaySchema = z.object({
  type: z.literal('mobilepay'),
  phone: phoneField,
})

export const mobilepay: PaymentMethodDefinition<typeof mobilepaySchema> = {
  type: 'mobilepay',
  countries: ['FI', 'DK'],
  currencies: ['EUR', 'DKK'],
  schema: mobilepaySchema,
  fields: [
    { name: 'phone', inputMode: 'tel', placeholder: '+358 40 123 4567' },
  ],
  summary: (details) => maskTail(details.phone),
  instructions: (details, request) => ({
    copy: [
      { label: 'phone', value: details.phone },
      { label: 'amount', value: amountText(request) },
      { label: 'message', value: truncate(request.note, 50) },
    ],
  }),
}
