import { z } from 'zod'
import { maskTail, minorToDecimalString, truncate } from '../format'
import type { PaymentMethodDefinition } from '../types'

/** ISO 13616 check: move the first four characters to the end, mod 97 = 1. */
export function isValidIban(iban: string): boolean {
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false
  const rearranged = iban.slice(4) + iban.slice(0, 4)
  let remainder = 0
  for (const char of rearranged) {
    const value = /\d/.test(char)
      ? char
      : String(char.charCodeAt(0) - 'A'.charCodeAt(0) + 10)
    for (const digit of value) {
      remainder = (remainder * 10 + Number(digit)) % 97
    }
  }
  return remainder === 1
}

const compact = (value: string) => value.replace(/\s+/g, '').toUpperCase()

const sepaSchema = z.object({
  type: z.literal('sepa'),
  iban: z.string().transform(compact).refine(isValidIban, 'invalidIban'),
  name: z.string().trim().min(1, 'min1').max(70, 'max70'),
  bic: z
    .string()
    .transform(compact)
    .refine(
      (bic) => bic === '' || /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic),
      'invalidBic',
    )
    .optional(),
})

export type SepaDetails = z.infer<typeof sepaSchema>

/** EPC QR limits (EPC069-12): amount 0.01–999999999.99, text 140. */
const EPC_MAX_MINOR = 99_999_999_999

/**
 * The European Payments Council "SEPA Credit Transfer" QR code
 * (EPC069-12, version 002, UTF-8). Most euro-area banking apps scan it.
 */
export function buildEpcPayload(
  details: SepaDetails,
  amountMinor: number,
  note: string,
): string | null {
  if (amountMinor <= 0 || amountMinor > EPC_MAX_MINOR) return null
  return [
    'BCD',
    '002',
    '1', // UTF-8
    'SCT',
    details.bic ?? '',
    truncate(details.name, 70),
    details.iban,
    `EUR${minorToDecimalString(amountMinor, 2)}`,
    '', // purpose
    '', // structured creditor reference
    truncate(note, 140),
  ].join('\n')
}

export const sepa: PaymentMethodDefinition<typeof sepaSchema> = {
  type: 'sepa',
  countries: ['EU'],
  currencies: ['EUR'],
  schema: sepaSchema,
  fields: [
    { name: 'name', placeholder: 'Ada Lovelace' },
    { name: 'iban', placeholder: 'FI21 1234 5600 0007 85' },
    { name: 'bic', optional: true, placeholder: 'NDEAFIHH' },
  ],
  summary: (details) => maskTail(details.iban),
  instructions(details, request) {
    const payload = buildEpcPayload(details, request.amountMinor, request.note)
    return {
      qr: payload ? { payload, errorCorrectionLevel: 'M' } : undefined,
      copy: [
        { label: 'recipient', value: details.name },
        { label: 'iban', value: details.iban.replace(/(.{4})/g, '$1 ').trim() },
        ...(details.bic ? [{ label: 'bic' as const, value: details.bic }] : []),
        {
          label: 'amount',
          value: minorToDecimalString(request.amountMinor, 2),
        },
        { label: 'message', value: truncate(request.note, 140) },
      ],
    }
  },
}
