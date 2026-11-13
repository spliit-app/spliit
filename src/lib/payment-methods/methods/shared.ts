import { z } from 'zod'
import { minorToDecimalString, normalizePhone } from '../format'
import type { PaymentRequest } from '../types'

export const phoneField = z
  .string()
  .transform(normalizePhone)
  .refine((phone) => /^\+?\d{6,15}$/.test(phone), 'invalidPhone')

export function amountText(request: PaymentRequest) {
  return minorToDecimalString(
    request.amountMinor,
    request.currency.decimalDigits,
  )
}
