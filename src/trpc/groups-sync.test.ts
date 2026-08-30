import { UserTier } from '@/lib/enums'
import { prisma } from '@/lib/prisma'
import { appRouter } from './routers/_app'

describe('Group Creation & Syncing', () => {
  const createCaller = (user: any) => appRouter.createCaller({ user })

  describe('Group Creation Gating', () => {
    it('blocks Guest from creating a group', async () => {
      const caller = createCaller(null)
      await expect(
        caller.groups.create({
          groupFormValues: {
            name: 'Test Group',
            currency: '$',
            currencyCode: 'USD',
            participants: [{ name: 'Alice' }, { name: 'Bob' }],
          },
        }),
      ).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      })
    })

    it('blocks sync_users from creating a group with FORBIDDEN approval notice', async () => {
      const caller = createCaller({
        id: 'usr_sync',
        name: 'Sync Only',
        email: 'sync@example.com',
        image: null,
        tier: UserTier.SYNC_USERS,
      })

      await expect(
        caller.groups.create({
          groupFormValues: {
            name: 'Test Group',
            currency: '$',
            currencyCode: 'USD',
            participants: [{ name: 'Alice' }, { name: 'Bob' }],
          },
        }),
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })
    })

    it('allows group_creators to create a group and associates with UserGroup', async () => {
      const creator = await prisma.user.create({
        data: {
          id: `creator-${Date.now()}`,
          name: 'Creator User',
          email: `creator-${Date.now()}@example.com`,
          tier: UserTier.GROUP_CREATORS,
        },
      })

      const caller = createCaller({
        id: creator.id,
        name: creator.name,
        email: creator.email,
        image: null,
        tier: UserTier.GROUP_CREATORS,
      })

      const res = await caller.groups.create({
        groupFormValues: {
          name: 'Creator Trip',
          currency: '$',
          currencyCode: 'USD',
          participants: [{ name: 'Alice' }, { name: 'Bob' }],
        },
      })

      expect(res.groupId).toBeDefined()

      // Verify UserGroup was created in DB
      const userGroup = await prisma.userGroup.findUnique({
        where: {
          userId_groupId: {
            userId: creator.id,
            groupId: res.groupId,
          },
        },
      })

      expect(userGroup).not.toBeNull()
      expect(userGroup?.groupId).toBe(res.groupId)
    })
  })

  describe('Cross-Device Syncing & Merging', () => {
    it('merges local storage groups into user account on sync', async () => {
      // Create a test user
      const user = await prisma.user.create({
        data: {
          id: `sync-user-${Date.now()}`,
          name: 'Sync Tester',
          email: `synctester-${Date.now()}@example.com`,
          tier: UserTier.SYNC_USERS,
        },
      })

      // Create two groups directly in DB
      const group1 = await prisma.group.create({
        data: {
          id: `grp1-${Date.now()}`,
          name: 'Local Group 1',
          currency: '$',
          participants: {
            create: [{ id: `p1-${Date.now()}`, name: 'Alice' }],
          },
        },
      })

      const group2 = await prisma.group.create({
        data: {
          id: `grp2-${Date.now()}`,
          name: 'Local Group 2',
          currency: '$',
          participants: {
            create: [{ id: `p2-${Date.now()}`, name: 'Bob' }],
          },
        },
      })

      const caller = createCaller({
        id: user.id,
        name: user.name,
        email: user.email,
        image: null,
        tier: UserTier.SYNC_USERS,
      })

      // Sync local groups into user account, with group1 starred
      const syncResult = await caller.groups.sync({
        localGroupIds: [group1.id, group2.id],
        starredGroupIds: [group1.id],
        archivedGroupIds: [],
      })

      expect(syncResult.isAuthenticated).toBe(true)
      expect(syncResult.groups.length).toBe(2)

      const syncedG1 = syncResult.groups.find((g) => g.id === group1.id)
      const syncedG2 = syncResult.groups.find((g) => g.id === group2.id)

      expect(syncedG1?.isStarred).toBe(true)
      expect(syncedG2?.isStarred).toBe(false)

      // Test recording access to another group
      const group3 = await prisma.group.create({
        data: {
          id: `grp3-${Date.now()}`,
          name: 'Accessed Group 3',
          currency: '$',
          participants: {
            create: [{ id: `p3-${Date.now()}`, name: 'Charlie' }],
          },
        },
      })

      await caller.groups.recordAccess({ groupId: group3.id })

      const syncResultAfterAccess = await caller.groups.sync({
        localGroupIds: [],
        starredGroupIds: [],
        archivedGroupIds: [],
      })

      expect(syncResultAfterAccess.groups.length).toBe(3)
      expect(syncResultAfterAccess.groups.some((g) => g.id === group3.id)).toBe(
        true,
      )
    })
  })
})
