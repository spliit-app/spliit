import {
  getPaymentOptions,
  parsePaymentMethods,
  paymentMethodSchema,
  type PaymentMethod,
  type PaymentRequest,
} from '@/lib/payment-methods'
import { minorToDecimalString, truncate } from './format'
import { buildEpcPayload, isValidIban } from './methods/sepa'

const eur = (amountMinor: number, note = 'Spliit · Trip'): PaymentRequest => ({
  amountMinor,
  currency: { code: 'EUR', decimalDigits: 2 },
  note,
})

function parse(input: unknown): PaymentMethod {
  return paymentMethodSchema.parse(input)
}

describe('minor units to text', () => {
  it.each([
    [1234, 2, '12.34'],
    [5, 2, '0.05'],
    [1000, 0, '1000'],
    [1250, 3, '1.250'],
    [-1234, 2, '-12.34'],
  ])('%i with %i decimals is %s', (minor, digits, text) => {
    expect(minorToDecimalString(minor, digits)).toBe(text)
  })

  it('cuts text without splitting an emoji', () => {
    expect(truncate('ab😀cd', 3)).toBe('ab😀')
  })
})

describe('SEPA', () => {
  it.each([
    'DE89370400440532013000',
    'FI2112345600000785',
    'GB82WEST12345698765432',
  ])('accepts the valid IBAN %s', (iban) =>
    expect(isValidIban(iban)).toBe(true),
  )

  it.each(['DE89370400440532013001', 'FI21', 'XX00ABC', 'fi2112345600000785'])(
    'rejects %s',
    (iban) => expect(isValidIban(iban)).toBe(false),
  )

  it('normalizes spaces and case on input', () => {
    const method = parse({
      type: 'sepa',
      name: 'Ada',
      iban: 'fi21 1234 5600 0007 85',
      bic: 'ndeafihh',
    })
    expect(method).toMatchObject({
      iban: 'FI2112345600000785',
      bic: 'NDEAFIHH',
    })
  })

  it('builds an EPC069-12 version 002 payload', () => {
    const details = parse({
      type: 'sepa',
      name: 'Ada Lovelace',
      iban: 'FI2112345600000785',
    })
    if (details.type !== 'sepa') throw new Error('expected sepa')
    expect(buildEpcPayload(details, 1234, 'Spliit · Trip')).toBe(
      [
        'BCD',
        '002',
        '1',
        'SCT',
        '',
        'Ada Lovelace',
        'FI2112345600000785',
        'EUR12.34',
        '',
        '',
        'Spliit · Trip',
      ].join('\n'),
    )
  })

  it('has no QR for amounts the EPC format cannot carry', () => {
    const details = parse({
      type: 'sepa',
      name: 'Ada',
      iban: 'FI2112345600000785',
    })
    if (details.type !== 'sepa') throw new Error('expected sepa')
    expect(buildEpcPayload(details, 0, '')).toBeNull()
    expect(buildEpcPayload(details, 100_000_000_000, '')).toBeNull()
  })

  it('caps the remittance text at 140 characters', () => {
    const details = parse({
      type: 'sepa',
      name: 'Ada',
      iban: 'FI2112345600000785',
    })
    if (details.type !== 'sepa') throw new Error('expected sepa')
    const payload = buildEpcPayload(details, 100, 'x'.repeat(200))
    expect(payload?.split('\n').at(-1)).toHaveLength(140)
  })
})

describe('payment options', () => {
  const methods = [
    parse({ type: 'sepa', name: 'Ada', iban: 'FI2112345600000785' }),
    parse({ type: 'venmo', username: '@ada-lovelace' }),
    parse({ type: 'paypal', username: 'https://paypal.me/adalovelace' }),
    parse({ type: 'revolut', username: '@ada' }),
    parse({ type: 'swish', phone: '+46 70 123 45 67' }),
    parse({ type: 'bizum', phone: '+34 612 345 678' }),
    parse({ type: 'mobilepay', phone: '040 123 4567' }),
  ]

  it('offers only methods that pay in the group currency', () => {
    expect(
      getPaymentOptions(methods, eur(1000)).map((o) => o.method.type),
    ).toEqual(['sepa', 'paypal', 'revolut', 'bizum', 'mobilepay'])
    const usd = { ...eur(1000), currency: { code: 'USD', decimalDigits: 2 } }
    expect(getPaymentOptions(methods, usd).map((o) => o.method.type)).toEqual([
      'venmo',
      'paypal',
      'revolut',
    ])
  })

  it('offers nothing for a zero amount', () => {
    expect(getPaymentOptions(methods, eur(0))).toEqual([])
  })

  it('prefills Venmo and PayPal links', () => {
    const usd = {
      amountMinor: 2050,
      currency: { code: 'USD', decimalDigits: 2 },
      note: 'Pizza & co',
    }
    const [venmo, paypal] = getPaymentOptions(methods, usd)
    expect(venmo.instructions.href).toBe(
      'https://venmo.com/ada-lovelace?txn=pay&amount=20.50&note=Pizza+%26+co',
    )
    expect(paypal.instructions.href).toBe(
      'https://paypal.me/adalovelace/20.50USD',
    )
  })

  it('formats PayPal amounts in zero-decimal currencies', () => {
    const jpy = {
      amountMinor: 1500,
      currency: { code: 'JPY', decimalDigits: 0 },
      note: '',
    }
    const paypal = getPaymentOptions(methods, jpy).find(
      (o) => o.method.type === 'paypal',
    )
    expect(paypal?.instructions.href).toBe(
      'https://paypal.me/adalovelace/1500JPY',
    )
  })

  it('builds a Swish prefilled QR with the national number', () => {
    const sek = {
      amountMinor: 12500,
      currency: { code: 'SEK', decimalDigits: 2 },
      note: 'Hyra; mars',
    }
    const [swish] = getPaymentOptions(methods, sek).filter(
      (o) => o.method.type === 'swish',
    )
    expect(swish.instructions.qr?.payload).toBe(
      'C0701234567;125.00;Hyra, mars;0',
    )
  })

  it('lists copyable details for apps without a pay link', () => {
    const bizum = getPaymentOptions(methods, eur(990)).find(
      (o) => o.method.type === 'bizum',
    )
    expect(bizum?.instructions.href).toBeUndefined()
    expect(bizum?.instructions.copy).toEqual([
      { label: 'phone', value: '+34612345678' },
      { label: 'amount', value: '9.90' },
      { label: 'message', value: 'Spliit · Trip' },
    ])
  })
})

describe('stored methods', () => {
  it('drops entries it cannot validate instead of failing', () => {
    const raw = JSON.stringify([
      { type: 'sepa', name: 'Ada', iban: 'FI2112345600000785' },
      { type: 'sepa', name: 'Bad', iban: 'FI0000' },
      { type: 'carrier-pigeon', coop: 'roof' },
    ])
    expect(parsePaymentMethods(raw).map((m) => m.type)).toEqual(['sepa'])
    expect(parsePaymentMethods('not json')).toEqual([])
    expect(parsePaymentMethods(null)).toEqual([])
  })
})
