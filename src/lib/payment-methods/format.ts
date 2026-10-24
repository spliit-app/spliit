/** Minor units to a plain decimal string with a dot: 1234, 2 → "12.34". */
export function minorToDecimalString(
  amountMinor: number,
  decimalDigits: number,
): string {
  if (!Number.isInteger(amountMinor)) {
    throw new Error('Amount must be an integer number of minor units')
  }
  const sign = amountMinor < 0 ? '-' : ''
  const digits = String(Math.abs(amountMinor)).padStart(decimalDigits + 1, '0')
  if (decimalDigits === 0) return `${sign}${digits}`
  const whole = digits.slice(0, -decimalDigits)
  const fraction = digits.slice(-decimalDigits)
  return `${sign}${whole}.${fraction}`
}

/** Cut to `max` characters without splitting a surrogate pair. */
export function truncate(text: string, max: number): string {
  const chars = Array.from(text.trim())
  return chars.length <= max ? chars.join('') : chars.slice(0, max).join('')
}

/** Digits with an optional leading +, spaces and punctuation removed. */
export function normalizePhone(value: string): string {
  const trimmed = value.trim()
  const plus = trimmed.startsWith('+') || trimmed.startsWith('00')
  const digits = trimmed.replace(/\D/g, '').replace(/^00/, '')
  return plus ? `+${digits}` : digits
}

/** Shows the last four characters: "•••• 1234". */
export function maskTail(value: string, visible = 4): string {
  return value.length <= visible ? value : `•••• ${value.slice(-visible)}`
}
