import type { z } from 'zod'

/**
 * What a payer needs to send money for one reimbursement. Kept free of app
 * types so the module can be copied into other Spliit forks as is.
 */
export type PaymentRequest = {
  /** In minor units of `currency`. Always positive. */
  amountMinor: number
  currency: {
    /** ISO 4217 code, or '' when the group uses a custom currency symbol. */
    code: string
    decimalDigits: number
  }
  /** Free text such as "Spliit · Trip to Rome"; each method truncates it. */
  note: string
}

export type CopyLabel =
  'recipient' | 'iban' | 'bic' | 'phone' | 'username' | 'amount' | 'message'

export type PaymentInstructions = {
  /** Text to encode in a QR code for a banking or payment app to scan. */
  qr?: { payload: string; errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H' }
  /** Opens the payment app or its website with the payment prefilled. */
  href?: string
  /** Values to copy by hand, always shown. */
  copy: { label: CopyLabel; value: string }[]
  /**
   * The link or QR format comes from third-party descriptions rather than the
   * provider's own documentation. The UI asks the payer to check the details.
   */
  unverified?: boolean
}

export type PaymentFieldSpec<T> = {
  name: Exclude<keyof T & string, 'type'>
  inputMode?: 'text' | 'tel'
  optional?: boolean
  placeholder?: string
}

export type PaymentMethodDefinition<
  S extends z.ZodObject = z.ZodObject,
  T = z.infer<S>,
> = {
  type: T extends { type: infer K } ? K : string
  /** Countries where the method is common, for ordering and hints. */
  countries: readonly string[]
  /** ISO codes the method can pay in, or 'any'. */
  currencies: readonly string[] | 'any'
  schema: S
  /** Form fields, in display order. */
  fields: readonly PaymentFieldSpec<T>[]
  /** Short text that identifies the account without revealing all of it. */
  summary(details: T): string
  instructions(details: T, request: PaymentRequest): PaymentInstructions
}
