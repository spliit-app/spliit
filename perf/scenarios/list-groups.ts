/**
 * The `/groups` home screen.
 *
 * Two client queries fire on mount and `httpBatchLink` combines them into one
 * request: `groups.list` with the ids from local storage
 * (src/app/groups/recent-group-list.tsx) and `groups.balances.forUser` with the
 * active participant per group (src/app/groups/global-balance-card.tsx).
 *
 * This is the step that puts a number on the fan-out in
 * src/trpc/routers/groups/balances/forUser.procedure.ts, which runs `getGroup`
 * plus a full unpaged `getGroupExpenses` for every single recent group.
 */
import { batched } from '../client'
import { config, groupId, participantId } from '../config'
import type { Step } from '../harness'

const groupIds = Array.from({ length: config.groups }, (_, i) => groupId(i + 1))

const forUser = groupIds.map((id, i) => ({
  groupId: id,
  // Participant 0 of each group is the "active user" the home screen tracks.
  participantId: participantId(i + 1, 0),
}))

export const listGroups: Step[] = [
  {
    name: 'list-groups:home',
    /** Rows: one per group listed, plus one balance per group. */
    run: async () => {
      const [groups, balances] = await Promise.all([
        batched.groups.list.query({ groupIds }),
        batched.groups.balances.forUser.query({ groups: forUser }),
      ])
      return groups.groups.length + balances.balances.length
    },
  },
]
