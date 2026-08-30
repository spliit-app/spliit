'use client'

import { LoginDialog } from '@/components/auth/login-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserTier } from '@/lib/enums'
import { trpc } from '@/trpc/client'
import { LogIn, LogOut, Shield } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export function UserMenu() {
  const { data, isLoading } = trpc.auth.me.useQuery()
  const utils = trpc.useUtils()
  const router = useRouter()

  if (isLoading) {
    return <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
  }

  const user = data?.user

  if (!user) {
    return (
      <LoginDialog
        trigger={
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <LogIn className="w-3.5 h-3.5" />
            Sign in
          </Button>
        }
      />
    )
  }

  const handleSignOut = async () => {
    await fetch('/api/auth/signout', { method: 'POST' })
    await utils.auth.invalidate()
    await utils.groups.invalidate()
    router.refresh()
    window.location.href = '/'
  }

  const tierBadgeVariant =
    user.tier === UserTier.ADMIN
      ? 'destructive'
      : user.tier === UserTier.GROUP_CREATORS
        ? 'default'
        : 'secondary'

  const tierLabel =
    user.tier === UserTier.ADMIN
      ? 'Admin'
      : user.tier === UserTier.GROUP_CREATORS
        ? 'Creator'
        : 'Sync'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-8 w-8 rounded-full p-0 flex items-center justify-center border"
        >
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name || 'User'}
              className="h-8 w-8 rounded-full object-cover"
              width={32}
              height={32}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium leading-none">
                {user.name || 'User'}
              </p>
              <Badge
                variant={tierBadgeVariant}
                className="text-[10px] px-1.5 py-0"
              >
                {tierLabel}
              </Badge>
            </div>
            {user.email && (
              <p className="text-xs leading-none text-muted-foreground truncate">
                {user.email}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {user.tier === UserTier.ADMIN && (
          <>
            <DropdownMenuItem asChild>
              <Link
                href="/admin"
                className="flex items-center gap-2 cursor-pointer text-primary"
              >
                <Shield className="w-4 h-4" />
                <span>Admin Dashboard</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem
          className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
