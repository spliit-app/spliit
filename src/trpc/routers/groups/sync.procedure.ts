import { getGroups } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

export const syncGroupsProcedure = baseProcedure
  .input(
    z.object({
      localGroupIds: z.array(z.string()).default([]),
      starredGroupIds: z.array(z.string()).default([]),
      archivedGroupIds: z.array(z.string()).default([]),
    }),
  )
  .mutation(
    async ({
      ctx,
      input: { localGroupIds, starredGroupIds, archivedGroupIds },
    }) => {
      // If user is logged in, merge local groups into DB and fetch all synced groups
      if (ctx.user) {
        const userId = ctx.user.id

        // Merge any valid local groups into UserGroup
        if (localGroupIds.length > 0) {
          const existingGroups = await prisma.group.findMany({
            where: { id: { in: localGroupIds } },
            select: { id: true },
          })

          for (const group of existingGroups) {
            await prisma.userGroup.upsert({
              where: {
                userId_groupId: {
                  userId,
                  groupId: group.id,
                },
              },
              create: {
                userId,
                groupId: group.id,
                isStarred: starredGroupIds.includes(group.id),
                isArchived: archivedGroupIds.includes(group.id),
              },
              update: {
                ...(starredGroupIds.includes(group.id)
                  ? { isStarred: true }
                  : {}),
                ...(archivedGroupIds.includes(group.id)
                  ? { isArchived: true }
                  : {}),
              },
            })
          }
        }

        // Fetch all synced groups for this user from DB
        const userGroups = await prisma.userGroup.findMany({
          where: { userId },
          include: {
            group: {
              include: {
                _count: {
                  select: { participants: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })

        return {
          isAuthenticated: true,
          groups: userGroups.map((ug) => ({
            id: ug.group.id,
            name: ug.group.name,
            information: ug.group.information,
            currency: ug.group.currency,
            currencyCode: ug.group.currencyCode,
            createdAt: ug.group.createdAt.toISOString(),
            _count: ug.group._count,
            isStarred: ug.isStarred,
            isArchived: ug.isArchived,
          })),
        }
      }

      // Guest / Unauthenticated: fetch details for localGroupIds
      const groups = await getGroups(localGroupIds)
      return {
        isAuthenticated: false,
        groups: groups.map((g) => ({
          ...g,
          isStarred: starredGroupIds.includes(g.id),
          isArchived: archivedGroupIds.includes(g.id),
        })),
      }
    },
  )

export const recordAccessProcedure = baseProcedure
  .input(
    z.object({
      groupId: z.string(),
    }),
  )
  .mutation(async ({ ctx, input: { groupId } }) => {
    if (ctx.user) {
      const groupExists = await prisma.group.findUnique({
        where: { id: groupId },
        select: { id: true },
      })

      if (groupExists) {
        await prisma.userGroup.upsert({
          where: {
            userId_groupId: {
              userId: ctx.user.id,
              groupId,
            },
          },
          create: {
            userId: ctx.user.id,
            groupId,
          },
          update: {},
        })
      }
    }
    return { success: true }
  })

export const toggleStarProcedure = baseProcedure
  .input(
    z.object({
      groupId: z.string(),
      isStarred: z.boolean(),
    }),
  )
  .mutation(async ({ ctx, input: { groupId, isStarred } }) => {
    if (ctx.user) {
      await prisma.userGroup.upsert({
        where: {
          userId_groupId: {
            userId: ctx.user.id,
            groupId,
          },
        },
        create: {
          userId: ctx.user.id,
          groupId,
          isStarred,
        },
        update: {
          isStarred,
        },
      })
    }
    return { success: true }
  })

export const toggleArchiveProcedure = baseProcedure
  .input(
    z.object({
      groupId: z.string(),
      isArchived: z.boolean(),
    }),
  )
  .mutation(async ({ ctx, input: { groupId, isArchived } }) => {
    if (ctx.user) {
      await prisma.userGroup.upsert({
        where: {
          userId_groupId: {
            userId: ctx.user.id,
            groupId,
          },
        },
        create: {
          userId: ctx.user.id,
          groupId,
          isArchived,
        },
        update: {
          isArchived,
        },
      })
    }
    return { success: true }
  })

export const removeUserGroupProcedure = baseProcedure
  .input(
    z.object({
      groupId: z.string(),
    }),
  )
  .mutation(async ({ ctx, input: { groupId } }) => {
    if (ctx.user) {
      await prisma.userGroup
        .delete({
          where: {
            userId_groupId: {
              userId: ctx.user.id,
              groupId,
            },
          },
        })
        .catch(() => null)
    }
    return { success: true }
  })
