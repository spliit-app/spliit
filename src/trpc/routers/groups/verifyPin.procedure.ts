import { prisma } from '@/lib/prisma'
import { pinMatchesHash } from '@/lib/group-pin'
import {
  assertPinNotRateLimited,
  clearPinFailures,
  recordPinFailure,
  setUnlockCookie,
} from '@/lib/group-access'
import { baseProcedure } from '@/trpc/init'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

export const verifyGroupPinProcedure = baseProcedure
  .input(
    z.object({
      groupId: z.string().min(1).max(30),
      pin: z
        .string()
        .min(4)
        .max(8)
        .regex(/^\d{4,8}$/),
    }),
  )
  .mutation(async ({ input: { groupId, pin } }) => {
    await assertPinNotRateLimited(groupId)
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { pinHash: true },
    })
    if (!group?.pinHash) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Group not found' })
    }
    const ok = await pinMatchesHash(pin, groupId, group.pinHash)
    if (!ok) {
      await recordPinFailure(groupId)
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Incorrect PIN' })
    }
    await clearPinFailures(groupId)
    await setUnlockCookie(groupId)
    return { ok: true as const }
  })
