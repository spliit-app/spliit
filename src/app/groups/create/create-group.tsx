'use client'

import { LoginDialog } from '@/components/auth/login-dialog'
import { GroupForm } from '@/components/group-form'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { UserTier } from '@/lib/enums'
import { trpc } from '@/trpc/client'
import { Lock, LogIn, ShieldAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export const CreateGroup = ({
  defaultCurrencyCode,
}: {
  defaultCurrencyCode: string
}) => {
  const { data: authData, isLoading: isAuthLoading } = trpc.auth.me.useQuery()
  const { mutateAsync, isPending } = trpc.groups.create.useMutation()
  const utils = trpc.useUtils()
  const router = useRouter()
  const [loginOpen, setLoginOpen] = useState(false)

  if (isAuthLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
        <p>Loading...</p>
      </div>
    )
  }

  const user = authData?.user

  // 1. Guest (Unauthenticated): prompt to sign in
  if (!user) {
    return (
      <div className="max-w-md mx-auto my-8">
        <Card className="border-dashed border-2">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Authentication Required</CardTitle>
            <CardDescription>
              To create new expense groups, please sign in with an external
              account. Invited group participants will still be able to join
              friction-free via your group link without signing in.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button className="w-full gap-2" onClick={() => setLoginOpen(true)}>
              <LogIn className="w-4 h-4" />
              Sign in to Create Group
            </Button>
            <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
          </CardContent>
        </Card>
      </div>
    )
  }

  // 2. Sync User (Authenticated but not approved for group creation): render approval notice
  if (user.tier === UserTier.SYNC_USERS) {
    return (
      <div className="max-w-xl mx-auto my-8">
        <Alert className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200">
          <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-base font-semibold">
            Group Creation Requires Approval
          </AlertTitle>
          <AlertDescription className="mt-2 text-sm space-y-3">
            <p>
              Your account is currently in the <strong>Sync User</strong> tier.
              You can participate in any groups shared with you and sync them
              across all your devices.
            </p>
            <p>
              Creating new expense groups requires authorization from an
              administrator. Please contact your instance administrator to
              promote your account to the <strong>Group Creator</strong> tier.
            </p>
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/groups')}
              >
                Return to My Groups
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // 3. Group Creator & Admin: render group form normally
  return (
    <GroupForm
      defaultCurrencyCode={defaultCurrencyCode}
      onSubmit={async (groupFormValues) => {
        const { groupId } = await mutateAsync({ groupFormValues })
        await utils.groups.invalidate()
        router.push(`/groups/${groupId}`)
      }}
    />
  )
}
