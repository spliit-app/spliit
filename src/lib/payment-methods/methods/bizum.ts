import { z } from 'zod'
import { maskTail, truncate } from '../format'
import type { PaymentMethodDefinition } from '../types'
import { amountText, phoneField } from './shared'

// Bizum (Spain): no public "pay this amount" link for person-to-person
// payments, so the payer copies the details.
const bizumSchema = z.object({ type: z.literal('bizum'), phone: phoneField })

export const bizum: PaymentMethodDefinition<typeof bizumSchema> = {
  type: 'bizum',
  countries: ['ES'],
  currencies: ['EUR'],
  schema: bizumSchema,
  fields: [{ name: 'phone', inputMode: 'tel', placeholder: '+34 612 345 678' }],
  summary: (details) => maskTail(details.phone),
  instructions: (details, request) => ({
    copy: [
      { label: 'phone', value: details.phone },
      { label: 'amount', value: amountText(request) },
      { label: 'message', value: truncate(request.note, 35) },
    ],
  }),
}
