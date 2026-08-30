export const SPLIT_MODES = [
  'EVENLY',
  'BY_SHARES',
  'BY_PERCENTAGE',
  'BY_AMOUNT',
] as const

export const SplitMode = {
  EVENLY: 'EVENLY',
  BY_SHARES: 'BY_SHARES',
  BY_PERCENTAGE: 'BY_PERCENTAGE',
  BY_AMOUNT: 'BY_AMOUNT',
} as const
export type SplitMode = (typeof SplitMode)[keyof typeof SplitMode]

export const RECURRENCE_RULES = ['NONE', 'DAILY', 'WEEKLY', 'MONTHLY'] as const

export const RecurrenceRule = {
  NONE: 'NONE',
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
} as const
export type RecurrenceRule =
  (typeof RecurrenceRule)[keyof typeof RecurrenceRule]

export const ACTIVITY_TYPES = [
  'UPDATE_GROUP',
  'CREATE_EXPENSE',
  'UPDATE_EXPENSE',
  'DELETE_EXPENSE',
] as const

export const ActivityType = {
  UPDATE_GROUP: 'UPDATE_GROUP',
  CREATE_EXPENSE: 'CREATE_EXPENSE',
  UPDATE_EXPENSE: 'UPDATE_EXPENSE',
  DELETE_EXPENSE: 'DELETE_EXPENSE',
} as const
export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType]

export const USER_TIERS = ['sync_users', 'group_creators', 'admin'] as const

export const UserTier = {
  SYNC_USERS: 'sync_users',
  GROUP_CREATORS: 'group_creators',
  ADMIN: 'admin',
} as const
export type UserTier = (typeof UserTier)[keyof typeof UserTier]
