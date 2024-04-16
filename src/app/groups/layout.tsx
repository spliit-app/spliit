import { auth } from '@/auth'
import { SignIn } from '@/components/signin'
import { PropsWithChildren, Suspense } from 'react'

export default async function GroupsLayout({
  children,
}: PropsWithChildren<{}>) {
  const session = await auth()

  if (!session)
    return (
      <div>
        Please sign in <br /> <SignIn />
      </div>
    )
  return (
    <Suspense>
      <main className="flex-1 max-w-screen-md w-full mx-auto px-4 py-6 flex flex-col gap-6">
        {children}
      </main>
    </Suspense>
  )
}
