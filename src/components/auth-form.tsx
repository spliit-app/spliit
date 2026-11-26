'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signIn, signUp } from '@/lib/auth-client'
import { safeNextPath } from '@/lib/safe-redirect'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'

type Props = {
  mode: 'login' | 'register'
}

/**
 * Email + password sign-in and sign-up.
 *
 * `?next=` is honoured because a shared group link is the usual way in: landing
 * on /groups after signing in and losing the group you clicked would make the
 * link feel broken.
 */
export function AuthForm({ mode }: Props) {
  const t = useTranslations('Auth')
  const searchParams = useSearchParams()
  const next = safeNextPath(searchParams.get('next'))
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const isRegister = mode === 'register'

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setIsPending(true)
    const { error } = isRegister
      ? await signUp.email({ name, email, password })
      : await signIn.email({ email, password })
    setIsPending(false)

    if (error) {
      setError(error.message ?? t('error'))
      return
    }
    // A real navigation, not `router.replace`: the header asks for the session
    // through a client-side query that was resolved (and cached as "signed out")
    // while this page rendered, and a client-side route change reuses that
    // cache. A full load makes the cookie and the client agree.
    window.location.assign(next)
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">
          {isRegister ? t('registerTitle') : t('loginTitle')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isRegister ? t('registerDescription') : t('loginDescription')}
        </p>
      </div>
      <form className="grid gap-4" onSubmit={submit}>
        {isRegister ? (
          <div className="grid gap-2">
            <Label htmlFor="name">{t('name')}</Label>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
        ) : null}
        <div className="grid gap-2">
          <Label htmlFor="email">{t('email')}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">{t('password')}</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={isPending}>
          {isRegister ? t('registerSubmit') : t('loginSubmit')}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
        {isRegister ? t('haveAccount') : t('noAccount')}{' '}
        <Link
          className="underline"
          href={{
            pathname: isRegister ? '/login' : '/register',
            query: next === '/groups' ? undefined : { next },
          }}
        >
          {isRegister ? t('loginLink') : t('registerLink')}
        </Link>
      </p>
    </div>
  )
}
