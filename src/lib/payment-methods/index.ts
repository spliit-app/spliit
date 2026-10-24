import { z } from 'zod'
import { bizum } from './methods/bizum'
import { mobilepay } from './methods/mobilepay'
import { paypal } from './methods/paypal'
import { revolut } from './methods/revolut'
import { sepa } from './methods/sepa'
import { swish } from './methods/swish'
import { venmo } from './methods/venmo'
import type {
  PaymentInstructions,
  PaymentMethodDefinition,
  PaymentRequest,
} from './types'

export type * from './types'

/**
 * Every supported way to get paid. To add a country's app, write one file in
 * ./methods and list it here; the form, the pay dialog and validation pick it
 * up from this list. Order is the order shown in the form's picker.
 */
export const PAYMENT_METHODS = [
  sepa,
  mobilepay,
  swish,
  bizum,
  venmo,
  paypal,
  revolut,
] as const

export const paymentMethodSchema = z.discriminatedUnion('type', [
  sepa.schema,
  mobilepay.schema,
  swish.schema,
  bizum.schema,
  venmo.schema,
  paypal.schema,
  revolut.schema,
])

export type PaymentMethod = z.infer<typeof paymentMethodSchema>
export type PaymentMethodType = PaymentMethod['type']

/** A definition seen through the union of all methods' details. */
export type AnyPaymentMethodDefinition = PaymentMethodDefinition<
  z.ZodObject,
  PaymentMethod
>

/** A participant can list a handful of ways to be paid. */
export const MAX_PAYMENT_METHODS = 10

export const paymentMethodsSchema = z
  .array(paymentMethodSchema)
  .max(MAX_PAYMENT_METHODS)

export function getPaymentMethodDefinition(
  type: string,
): AnyPaymentMethodDefinition | undefined {
  return PAYMENT_METHODS.find((method) => method.type === type) as
    AnyPaymentMethodDefinition | undefined
}

/**
 * Read stored methods leniently: rows written by an older or newer version
 * may hold entries this version cannot validate. Those are dropped rather
 * than failing the whole group.
 */
export function parsePaymentMethods(raw: unknown): PaymentMethod[] {
  let value = raw
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw)
    } catch {
      return []
    }
  }
  if (!Array.isArray(value)) return []
  return value
    .flatMap((entry) => {
      const parsed = paymentMethodSchema.safeParse(entry)
      return parsed.success ? [parsed.data] : []
    })
    .slice(0, MAX_PAYMENT_METHODS)
}

export function supportsCurrency(
  definition: Pick<AnyPaymentMethodDefinition, 'currencies'>,
  currencyCode: string,
): boolean {
  if (definition.currencies === 'any') return true
  return definition.currencies.includes(currencyCode)
}

export type PaymentOption = {
  method: PaymentMethod
  instructions: PaymentInstructions
}

/** The receiver's methods that can pay this request, with what to show. */
export function getPaymentOptions(
  methods: PaymentMethod[],
  request: PaymentRequest,
): PaymentOption[] {
  if (request.amountMinor <= 0) return []
  return methods.flatMap((method) => {
    const definition = getPaymentMethodDefinition(method.type)
    if (!definition || !supportsCurrency(definition, request.currency.code)) {
      return []
    }
    return [{ method, instructions: definition.instructions(method, request) }]
  })
}
