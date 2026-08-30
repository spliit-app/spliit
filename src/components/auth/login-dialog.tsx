'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { trpc } from '@/trpc/client'
import { AlertCircle, LogIn } from 'lucide-react'
import { PropsWithChildren, useState } from 'react'

export function LoginDialog({
  children,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: PropsWithChildren<{
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}>) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? setControlledOpen! : setInternalOpen

  const { data: authData, isLoading } = trpc.auth.me.useQuery()

  const providers = authData?.providers || { google: false, github: false }
  const hasGoogle = Boolean(providers.google)
  const hasGithub = Boolean(providers.github)
  const hasAnyOAuth = hasGoogle || hasGithub

  const handleOAuthSignIn = (provider: string) => {
    window.location.href = `/api/auth/signin/${provider}`
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : children ? (
        <DialogTrigger asChild>{children}</DialogTrigger>
      ) : null}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="w-5 h-5 text-primary" />
            Sign in to Spliit
          </DialogTitle>
          <DialogDescription>
            Sign in with an external account to enable cross-device group
            synchronization.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-4">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">
              Loading available login methods...
            </div>
          ) : (
            <>
              {hasGoogle && (
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center gap-3 py-5 cursor-pointer"
                  onClick={() => handleOAuthSignIn('google')}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  Continue with Google
                </Button>
              )}

              {hasGithub && (
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center gap-3 py-5 cursor-pointer"
                  onClick={() => handleOAuthSignIn('github')}
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  Continue with GitHub
                </Button>
              )}

              {!hasAnyOAuth && (
                <div className="flex items-center gap-2 p-3 text-xs rounded-md bg-muted text-muted-foreground border">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>
                    No OAuth providers are configured. Set AUTH_GOOGLE_ID /
                    AUTH_GOOGLE_SECRET in your .env to enable sign-in.
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
