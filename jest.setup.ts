import { webcrypto } from 'node:crypto'
import { TextDecoder, TextEncoder } from 'node:util'

if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = TextEncoder as any
  globalThis.TextDecoder = TextDecoder as any
}

if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = webcrypto as any
}
