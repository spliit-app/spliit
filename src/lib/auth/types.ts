import { UserTier } from '@/lib/enums'

export type AuthUser = {
  id: string
  name: string | null
  email: string | null
  image: string | null
  tier: UserTier
}

export type AuthSession = {
  user: AuthUser | null
}
