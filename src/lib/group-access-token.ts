import 'server-only'

import { pinCookieName } from '@/lib/group-pin'

const UNLOCK_MAX_AGE_SECONDS = 60 * 60 * 12

function getPinSecret(): string {
  const secret = process.env.PIN_SECRET
  if (secret && secret.length >= 16) return secret
  if (process.env.NODE_ENV !== 'production') {
    return 'dev-only-pin-secret-change-me'
  }
  throw new Error('PIN_SECRET is not configured')
}

async function hmacHex(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getPinSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(value),
  )
  return Array.from(new Uint8Array(sig))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function issueUnlockToken(groupId: string): Promise<string> {
  const issuedAt = Date.now().toString()
  const sig = await hmacHex(`${groupId}:${issuedAt}`)
  return `${issuedAt}.${sig}`
}

export async function verifyUnlockToken(
  groupId: string,
  token: string,
): Promise<boolean> {
  const dot = token.indexOf('.')
  if (dot <= 0) return false
  const issuedAt = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const issued = Number(issuedAt)
  if (!Number.isFinite(issued)) return false
  if (Date.now() - issued > UNLOCK_MAX_AGE_SECONDS * 1000) return false
  const expected = await hmacHex(`${groupId}:${issuedAt}`)
  if (expected.length !== sig.length) return false
  let mismatch = 0
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ sig.charCodeAt(i)
  }
  return mismatch === 0
}

export { pinCookieName, UNLOCK_MAX_AGE_SECONDS }
