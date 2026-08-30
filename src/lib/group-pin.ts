const PBKDF2_ITERATIONS = 100_000
const PBKDF2_PREFIX = 'pbkdf2$'

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function hashGroupPin(
  pin: string,
  groupId: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: new TextEncoder().encode(`spliit-pin:${groupId}`),
      iterations: PBKDF2_ITERATIONS,
    },
    key,
    256,
  )
  return `${PBKDF2_PREFIX}${PBKDF2_ITERATIONS}$${bytesToHex(new Uint8Array(bits))}`
}

export async function pinMatchesHash(
  pin: string,
  groupId: string,
  pinHash: string,
): Promise<boolean> {
  const expected = await hashGroupPin(pin, groupId)
  return expected === pinHash
}

export function pinCookieName(groupId: string) {
  return `spliit_pin_${groupId}`
}
