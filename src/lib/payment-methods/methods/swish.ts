import { z } from 'zod'
import { maskTail, truncate } from '../format'
import type { PaymentMethodDefinition } from '../types'
import { amountText, phoneField } from './shared'

// Swish (Sweden). Prefilled QR in the "C" format: payee;amount;message;lock.
// The format is described by third parties, not by Swish's public docs.
const swishSchema = z.object({
  type: z.literal('swish'),
  phone: phoneField,
})

export const swish: PaymentMethodDefinition<typeof swishSchema> = {
  type: 'swish',
  countries: ['SE'],
  currencies: ['SEK'],
  schema: swishSchema,
  fields: [{ name: 'phone', inputMode: 'tel', placeholder: '070 123 45 67' }],
  summary: (details) => maskTail(details.phone),
  instructions(details, request) {
    // Swish wants the national number (07…), without +46.
    const payee = details.phone.replace(/^\+46/, '0').replace(/^\+/, '')
    // Message: max 50 characters; ';' would end the field early.
    const message = truncate(request.note.replace(/;/g, ','), 50)
    const amount = amountText(request)
    return {
      qr: {
        // 0: nothing editable in the app (payee, amount, message all locked).
        payload: `C${payee};${amount};${message};0`,
        errorCorrectionLevel: 'M',
      },
      copy: [
        { label: 'phone', value: payee },
        { label: 'amount', value: amount },
        { label: 'message', value: message },
      ],
      unverified: true,
    }
  },
}
