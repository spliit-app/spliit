/**
 * Max groups accepted by `groups.list` and `balances.forUser` in one call.
 * Recent-groups localStorage is unbounded; callers must slice to this.
 */
export const MAX_GROUPS_PER_QUERY = 100
