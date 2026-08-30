import { UserTier } from '@/lib/enums'
import { prisma } from '@/lib/prisma'
import { execSync } from 'node:child_process'

describe('Admin Bootstrap CLI Script', () => {
  it('promotes an existing user to admin tier by email', async () => {
    const email = `bootstrap-test-${Date.now()}@example.com`

    // Create sync user
    const user = await prisma.user.create({
      data: {
        id: `usr-bootstrap-${Date.now()}`,
        name: 'Bootstrap Tester',
        email,
        tier: UserTier.SYNC_USERS,
      },
    })

    expect(user.tier).toBe(UserTier.SYNC_USERS)

    // Execute make-admin CLI script
    const output = execSync(`node scripts/make-admin.mjs ${email}`, {
      encoding: 'utf-8',
      env: { ...process.env, DATABASE_URL: 'file:./spliit.db' },
    })

    expect(output).toContain('Successfully promoted user')

    // Verify user in DB is now admin
    const updated = await prisma.user.findUnique({
      where: { id: user.id },
    })

    expect(updated?.tier).toBe(UserTier.ADMIN)
  })

  it('pre-authorizes a user as admin even before they log in', async () => {
    const newEmail = `preauth-cli-${Date.now()}@example.com`

    const output = execSync(`node scripts/make-admin.mjs ${newEmail}`, {
      encoding: 'utf-8',
      env: { ...process.env, DATABASE_URL: 'file:./spliit.db' },
    })

    expect(output).toContain('Successfully pre-authorized user')

    // Verify user in DB was created with ADMIN tier
    const created = await prisma.user.findUnique({
      where: { email: newEmail },
    })

    expect(created).not.toBeNull()
    expect(created?.tier).toBe(UserTier.ADMIN)
  })

  it('fails gracefully when no email argument is provided', () => {
    expect(() => {
      execSync(`node scripts/make-admin.mjs`, {
        encoding: 'utf-8',
        stdio: 'pipe',
        env: { ...process.env, DATABASE_URL: 'file:./spliit.db' },
      })
    }).toThrow()
  })
})
