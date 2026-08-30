import { webcrypto } from 'node:crypto'
import { hashGroupPin, pinMatchesHash } from '@/lib/group-pin'

if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto })
}

describe('group-pin', () => {
  it('hashes with PBKDF2 and verifies', async () => {
    const hash = await hashGroupPin('123456', 'group-1')
    expect(hash.startsWith('pbkdf2$100000$')).toBe(true)
    expect(await pinMatchesHash('123456', 'group-1', hash)).toBe(true)
    expect(await pinMatchesHash('000000', 'group-1', hash)).toBe(false)
    expect(await pinMatchesHash('123456', 'group-2', hash)).toBe(false)
  })
})
