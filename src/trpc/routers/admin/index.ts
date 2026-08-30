import { USER_TIERS, UserTier } from '@/lib/enums'
import { prisma } from '@/lib/prisma'
import { adminProcedure, createTRPCRouter } from '@/trpc/init'
import { z } from 'zod'

export const adminRouter = createTRPCRouter({
  getMetrics: adminProcedure.query(async () => {
    const [totalGroups, totalExpenses, totalUsers, usersByTier] =
      await Promise.all([
        prisma.group.count(),
        prisma.expense.count(),
        prisma.user.count(),
        prisma.user.groupBy({
          by: ['tier'],
          _count: { tier: true },
        }),
      ])

    const tierCounts: Record<string, number> = {
      [UserTier.SYNC_USERS]: 0,
      [UserTier.GROUP_CREATORS]: 0,
      [UserTier.ADMIN]: 0,
    }

    for (const group of usersByTier) {
      if (group.tier in tierCounts) {
        tierCounts[group.tier] = group._count.tier
      }
    }

    return {
      totalGroups,
      totalExpenses,
      totalUsers,
      tierCounts,
    }
  }),

  listUsers: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(10),
        search: z.string().optional(),
        tier: z.string().optional(),
      }),
    )
    .query(async ({ input: { page, limit, search, tier } }) => {
      const skip = (page - 1) * limit

      const where: any = {}

      if (
        tier &&
        tier !== 'all' &&
        (USER_TIERS as readonly string[]).includes(tier)
      ) {
        where.tier = tier
      }

      if (search && search.trim().length > 0) {
        const query = search.trim()
        where.OR = [
          { name: { contains: query } },
          { email: { contains: query } },
        ]
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          include: {
            accounts: {
              select: { provider: true },
            },
            _count: {
              select: { userGroups: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.user.count({ where }),
      ])

      return {
        users: users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          image: u.image,
          tier: u.tier as UserTier,
          createdAt: u.createdAt.toISOString(),
          providers: u.accounts.map((a) => a.provider),
          groupsCount: u._count.userGroups,
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit) || 1,
      }
    }),

  preAuthorizeUser: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        tier: z.enum(USER_TIERS).default(UserTier.GROUP_CREATORS),
        name: z.string().optional(),
      }),
    )
    .mutation(async ({ input: { email, tier, name } }) => {
      const normalizedEmail = email.trim().toLowerCase()

      const existing = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      })

      if (existing) {
        const updated = await prisma.user.update({
          where: { id: existing.id },
          data: {
            tier,
            name: existing.name || name?.trim() || undefined,
          },
        })
        return { user: updated, isNew: false }
      }

      const newUser = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: name?.trim() || null,
          tier,
        },
      })

      return { user: newUser, isNew: true }
    }),

  updateUserTier: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        tier: z.enum(USER_TIERS),
      }),
    )
    .mutation(async ({ input: { userId, tier } }) => {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { tier },
      })

      return {
        id: updatedUser.id,
        tier: updatedUser.tier as UserTier,
      }
    }),

  deleteUser: adminProcedure
    .input(
      z.object({
        userId: z.string(),
      }),
    )
    .mutation(async ({ input: { userId } }) => {
      await prisma.user.delete({
        where: { id: userId },
      })
      return { success: true }
    }),

  listGroups: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(10),
        search: z.string().optional(),
      }),
    )
    .query(async ({ input: { page, limit, search } }) => {
      const skip = (page - 1) * limit

      const where: any = {}

      if (search && search.trim().length > 0) {
        const query = search.trim()
        where.OR = [{ name: { contains: query } }, { id: { contains: query } }]
      }

      const [groups, total] = await Promise.all([
        prisma.group.findMany({
          where,
          include: {
            _count: {
              select: {
                participants: true,
                expenses: true,
                userGroups: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.group.count({ where }),
      ])

      return {
        groups: groups.map((g) => ({
          id: g.id,
          name: g.name,
          currency: g.currency,
          currencyCode: g.currencyCode,
          createdAt: g.createdAt.toISOString(),
          participantsCount: g._count.participants,
          expensesCount: g._count.expenses,
          syncedUsersCount: g._count.userGroups,
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit) || 1,
      }
    }),

  deleteGroup: adminProcedure
    .input(
      z.object({
        groupId: z.string(),
      }),
    )
    .mutation(async ({ input: { groupId } }) => {
      await prisma.group.delete({
        where: { id: groupId },
      })
      return { success: true, groupId }
    }),
})
