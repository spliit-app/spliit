import { upsertOAuthUser } from '@/lib/auth/oauth'
import { UserTier } from '@/lib/enums'
import { prisma } from '@/lib/prisma'
import { appRouter } from './routers/_app'

describe('Admin Router & Management', () => {
  const createCaller = (user: any) => appRouter.createCaller({ user })

  describe('Authorization', () => {
    it('blocks non-admin users from accessing metrics', async () => {
      const caller = createCaller({
        id: 'usr_non_admin',
        name: 'Normal User',
        email: 'user@example.com',
        tier: UserTier.SYNC_USERS,
      })

      await expect(caller.admin.getMetrics()).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })
    })

    it('blocks group creators from accessing user management', async () => {
      const caller = createCaller({
        id: 'usr_creator',
        name: 'Creator User',
        email: 'creator@example.com',
        tier: UserTier.GROUP_CREATORS,
      })

      await expect(caller.admin.listUsers({})).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })
    })

    it('blocks non-admin users from listing or deleting groups in admin panel', async () => {
      const caller = createCaller({
        id: 'usr_sync_user',
        name: 'Sync User',
        email: 'sync@example.com',
        tier: UserTier.SYNC_USERS,
      })

      await expect(caller.admin.listGroups({})).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })

      await expect(
        caller.admin.deleteGroup({ groupId: 'any_group' }),
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })
    })
  })

  describe('Metrics, User Listing & Tier Promotion', () => {
    it('allows admin to fetch system metrics, search users, and promote/demote tiers', async () => {
      // Create admin user
      const adminUser = await prisma.user.create({
        data: {
          id: `admin-${Date.now()}`,
          name: 'Super Admin',
          email: `admin-${Date.now()}@example.com`,
          tier: UserTier.ADMIN,
        },
      })

      // Create sync user
      const targetUser = await prisma.user.create({
        data: {
          id: `target-${Date.now()}`,
          name: 'Target Alice',
          email: `alice-${Date.now()}@example.com`,
          tier: UserTier.SYNC_USERS,
        },
      })

      const caller = createCaller({
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        image: null,
        tier: UserTier.ADMIN,
      })

      // 1. Check metrics
      const metrics = await caller.admin.getMetrics()
      expect(metrics.totalUsers).toBeGreaterThanOrEqual(2)
      expect(metrics.tierCounts[UserTier.ADMIN]).toBeGreaterThanOrEqual(1)
      expect(metrics.tierCounts[UserTier.SYNC_USERS]).toBeGreaterThanOrEqual(1)

      // 2. List users with search
      const listRes = await caller.admin.listUsers({
        search: 'Target Alice',
      })
      expect(listRes.users.some((u) => u.id === targetUser.id)).toBe(true)

      // 3. Promote target user to group_creators
      const promoteRes = await caller.admin.updateUserTier({
        userId: targetUser.id,
        tier: UserTier.GROUP_CREATORS,
      })
      expect(promoteRes.tier).toBe(UserTier.GROUP_CREATORS)

      // Verify in DB
      const updatedInDb = await prisma.user.findUnique({
        where: { id: targetUser.id },
      })
      expect(updatedInDb?.tier).toBe(UserTier.GROUP_CREATORS)

      // 4. Promote target user to admin
      const promoteToAdmin = await caller.admin.updateUserTier({
        userId: targetUser.id,
        tier: UserTier.ADMIN,
      })
      expect(promoteToAdmin.tier).toBe(UserTier.ADMIN)
    })

    it('pre-authorizes a user before they log in, preserving their tier on OAuth login', async () => {
      const admin = await prisma.user.create({
        data: {
          id: `admin-preauth-${Date.now()}`,
          name: 'Preauth Admin',
          email: `adminpreauth-${Date.now()}@example.com`,
          tier: UserTier.ADMIN,
        },
      })

      const caller = createCaller({
        id: admin.id,
        name: admin.name,
        email: admin.email,
        image: null,
        tier: UserTier.ADMIN,
      })

      const friendEmail = `friend-${Date.now()}@example.com`

      // 1. Admin pre-authorizes friend as group_creators before friend logs in
      const preAuthResult = await caller.admin.preAuthorizeUser({
        email: friendEmail,
        name: 'Friend Bob',
        tier: UserTier.GROUP_CREATORS,
      })

      expect(preAuthResult.isNew).toBe(true)
      expect(preAuthResult.user.email).toBe(friendEmail)
      expect(preAuthResult.user.tier).toBe(UserTier.GROUP_CREATORS)

      // 2. Friend logs in for the first time via OAuth
      const oAuthUser = await upsertOAuthUser({
        provider: 'google',
        providerAccountId: `google-sub-${Date.now()}`,
        email: friendEmail,
        name: 'Bob Google Profile',
        image: 'https://example.com/avatar.jpg',
      })

      // Verify friend retained the pre-authorized Group Creator tier
      expect(oAuthUser.id).toBe(preAuthResult.user.id)
      expect(oAuthUser.tier).toBe(UserTier.GROUP_CREATORS)
      expect(oAuthUser.name).toBe('Bob Google Profile')
    })
  })

  describe('Group Management & Deletion', () => {
    it('allows admin to list all groups with search and delete groups', async () => {
      const admin = await prisma.user.create({
        data: {
          id: `admin-grp-${Date.now()}`,
          name: 'Admin Group Tester',
          email: `admingrp-${Date.now()}@example.com`,
          tier: UserTier.ADMIN,
        },
      })

      const caller = createCaller({
        id: admin.id,
        name: admin.name,
        email: admin.email,
        image: null,
        tier: UserTier.ADMIN,
      })

      // Create a test group
      const testGroup = await prisma.group.create({
        data: {
          id: `grp-delete-${Date.now()}`,
          name: 'Weekend Ski Trip',
          currency: '$',
          participants: {
            create: [
              { id: `part-1-${Date.now()}`, name: 'Alice' },
              { id: `part-2-${Date.now()}`, name: 'Bob' },
            ],
          },
        },
      })

      // List groups and verify testGroup is returned
      const listRes = await caller.admin.listGroups({
        search: 'Ski Trip',
      })

      expect(listRes.groups.some((g) => g.id === testGroup.id)).toBe(true)
      const foundGroup = listRes.groups.find((g) => g.id === testGroup.id)
      expect(foundGroup?.participantsCount).toBe(2)

      // Delete group as admin
      const deleteRes = await caller.admin.deleteGroup({
        groupId: testGroup.id,
      })

      expect(deleteRes.success).toBe(true)

      // Verify group no longer exists in DB
      const dbGroup = await prisma.group.findUnique({
        where: { id: testGroup.id },
      })
      expect(dbGroup).toBeNull()
    })
  })
})
