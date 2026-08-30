import { UserTier } from '@/lib/enums'
import {
  adminProcedure,
  authenticatedProcedure,
  createTRPCRouter,
  groupCreatorProcedure,
} from './init'

describe('RBAC Procedure Guards', () => {
  const testRouter = createTRPCRouter({
    authenticatedOnly: authenticatedProcedure.query(({ ctx }) => {
      return { ok: true, user: ctx.user }
    }),
    groupCreatorOnly: groupCreatorProcedure.mutation(({ ctx }) => {
      return { created: true, user: ctx.user }
    }),
    adminOnly: adminProcedure.query(({ ctx }) => {
      return { adminData: true, user: ctx.user }
    }),
  })

  const createCaller = (user: any) => testRouter.createCaller({ user })

  describe('Guest (Unauthenticated)', () => {
    const caller = createCaller(null)

    it('blocks authenticated-only procedures with UNAUTHORIZED', async () => {
      await expect(caller.authenticatedOnly()).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      })
    })

    it('blocks group-creator procedures with UNAUTHORIZED', async () => {
      await expect(caller.groupCreatorOnly()).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      })
    })

    it('blocks admin procedures with UNAUTHORIZED', async () => {
      await expect(caller.adminOnly()).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      })
    })
  })

  describe('Sync User (sync_users)', () => {
    const syncUser = {
      id: 'usr_sync',
      name: 'Sync User',
      email: 'sync@example.com',
      image: null,
      tier: UserTier.SYNC_USERS,
    }
    const caller = createCaller(syncUser)

    it('allows authenticated-only procedures', async () => {
      const result = await caller.authenticatedOnly()
      expect(result.ok).toBe(true)
      expect(result.user?.id).toBe('usr_sync')
    })

    it('blocks group creation with FORBIDDEN approval notice', async () => {
      await expect(caller.groupCreatorOnly()).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })
    })

    it('blocks admin procedures with FORBIDDEN', async () => {
      await expect(caller.adminOnly()).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })
    })
  })

  describe('Group Creator (group_creators)', () => {
    const creatorUser = {
      id: 'usr_creator',
      name: 'Creator',
      email: 'creator@example.com',
      image: null,
      tier: UserTier.GROUP_CREATORS,
    }
    const caller = createCaller(creatorUser)

    it('allows authenticated-only procedures', async () => {
      const result = await caller.authenticatedOnly()
      expect(result.ok).toBe(true)
    })

    it('allows group creation', async () => {
      const result = await caller.groupCreatorOnly()
      expect(result.created).toBe(true)
    })

    it('blocks admin procedures with FORBIDDEN', async () => {
      await expect(caller.adminOnly()).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })
    })
  })

  describe('Administrator (admin)', () => {
    const adminUser = {
      id: 'usr_admin',
      name: 'Admin',
      email: 'admin@example.com',
      image: null,
      tier: UserTier.ADMIN,
    }
    const caller = createCaller(adminUser)

    it('allows authenticated-only procedures', async () => {
      const result = await caller.authenticatedOnly()
      expect(result.ok).toBe(true)
    })

    it('allows group creation', async () => {
      const result = await caller.groupCreatorOnly()
      expect(result.created).toBe(true)
    })

    it('allows admin procedures', async () => {
      const result = await caller.adminOnly()
      expect(result.adminData).toBe(true)
    })
  })
})
