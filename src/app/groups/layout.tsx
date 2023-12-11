import { PropsWithChildren } from 'react'

export default function GroupsLayout({ children }: PropsWithChildren<{}>) {
  return (
    <main className="flex-1 max-w-screen-md w-full mx-auto p-4 flex flex-col gap-2">
      {children}
    </main>
  )
}
