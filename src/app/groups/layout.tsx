import { getSession, loginPathFor } from '@/lib/auth-server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { PropsWithChildren, Suspense } from 'react'

export default async function GroupsLayout({
  children,
}: PropsWithChildren<{}>) {
  // Authoritative check: the proxy only saw a cookie, this resolves it. A
  // revision in the database therefore signs a user out immediately.
  const session = await getSession()
  if (!session) {
    const attempted = (await headers()).get('x-pathname') ?? '/groups'
    redirect(loginPathFor(attempted))
  }

  return (
    <Suspense>
      <main className="flex-1 max-w-screen-md w-full mx-auto px-4 py-6 flex flex-col gap-6">
        {children}
      </main>
    </Suspense>
  )
}
