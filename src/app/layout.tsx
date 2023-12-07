import { ProgressBar } from '@/components/progress-bar'
import { Button } from '@/components/ui/button'
import { env } from '@/lib/env'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_BASE_URL),
  title: {
    default: 'Spliit · Share expenses with friends and family',
    template: '%s · Spliit',
  },
  description:
    'Spliit is a minimalist web application to share expenses with friends and family. No ads, no account, no problem.',
  openGraph: {
    title: 'Spliit · Share expenses with friends and family',
    description:
      'Spliit is a minimalist web application to share expenses with friends and family. No ads, no account, no problem.',
    images: `/banner.png`,
    type: 'website',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@scastiel',
    site: '@scastiel',
    images: `/banner.png`,
    title: 'Spliit · Share expenses with friends and family',
    description:
      'Spliit is a minimalist web application to share expenses with friends and family. No ads, no account, no problem.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="">
        <ProgressBar />
        <header className="fixed top-0 left-0 right-0 flex justify-between bg-white bg-opacity-50 p-2 border-b backdrop-blur-sm">
          <Link className="flex items-center gap-2" href="/">
            <Image src="/logo.svg" width={30} height={30} alt="" />
            <h1 className="font-bold text-primary">Spliit</h1>
          </Link>
          <ul role="nav" className="flex items-center text-sm">
            <li>
              <Button variant="link" asChild className="-my-3">
                <Link href="/groups">Groups</Link>
              </Button>
            </li>
          </ul>
        </header>
        <div className="max-w-screen-md mx-auto p-4 pt-16">{children}</div>
      </body>
    </html>
  )
}
