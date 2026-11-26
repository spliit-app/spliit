'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { authClient } from '@/lib/auth-client'
import { LogIn, LogOut, UserRound } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Log in / sign up when signed out, email + log out when signed in.
 *
 * Signing out reloads the current path, so the user sees exactly what a
 * signed-out visitor sees -- including the login wall on a group page.
 */
export function AccountMenu() {
  const t = useTranslations('Account')
  const pathname = usePathname()
  const { data: session, isPending } = authClient.useSession()

  if (isPending) return null

  if (!session) {
    return (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" asChild className="-my-3">
          <Link href={{ pathname: '/login', query: { next: pathname } }}>
            {t('signIn')}
          </Link>
        </Button>
        <Button variant="ghost" size="sm" asChild className="-my-3">
          <Link href={{ pathname: '/register', query: { next: pathname } }}>
            {t('signUp')}
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="-my-3"
          data-testid="account-menu"
        >
          <UserRound className="h-4 w-4" />
          <span className="sr-only">{t('label')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">
          {session.user.name}
          <span className="block truncate text-xs font-normal text-muted-foreground">
            {session.user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await authClient.signOut()
            // Reload rather than `router.refresh()`: the header reads the
            // session from a client cache, which would otherwise keep showing
            // the signed-in menu (and a group page would not hit the wall).
            window.location.reload()
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {t('signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export const AccountMenuSignInIcon = LogIn
