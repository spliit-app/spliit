import { UserTier } from '@/lib/enums'
import { createSessionToken, verifySessionToken } from './session'

describe('Auth Session Tokens', () => {
  it('creates and verifies a valid JWT session token for a sync_user', async () => {
    const user = {
      id: 'usr_123',
      name: 'Alice',
      email: 'alice@example.com',
      image: 'https://example.com/alice.png',
      tier: UserTier.SYNC_USERS,
    }

    const token = await createSessionToken(user)
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(20)

    const verified = await verifySessionToken(token)
    expect(verified).not.toBeNull()
    expect(verified?.id).toBe('usr_123')
    expect(verified?.name).toBe('Alice')
    expect(verified?.email).toBe('alice@example.com')
    expect(verified?.image).toBe('https://example.com/alice.png')
    expect(verified?.tier).toBe(UserTier.SYNC_USERS)
  })

  it('creates and verifies a token with group_creators tier', async () => {
    const user = {
      id: 'usr_creator',
      name: 'Bob',
      email: 'bob@example.com',
      tier: UserTier.GROUP_CREATORS,
    }

    const token = await createSessionToken(user)
    const verified = await verifySessionToken(token)
    expect(verified?.tier).toBe(UserTier.GROUP_CREATORS)
  })

  it('creates and verifies a token with admin tier', async () => {
    const user = {
      id: 'usr_admin',
      name: 'Admin User',
      email: 'admin@example.com',
      tier: UserTier.ADMIN,
    }

    const token = await createSessionToken(user)
    const verified = await verifySessionToken(token)
    expect(verified?.tier).toBe(UserTier.ADMIN)
  })

  it('returns null for an invalid or tampered token', async () => {
    const verified = await verifySessionToken('invalid.jwt.token')
    expect(verified).toBeNull()
  })
})
