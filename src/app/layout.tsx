import { ApplePwaSplash } from '@/app/apple-pwa-splash'
import { ProgressBar } from '@/components/progress-bar'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/toaster'
import { env } from '@/lib/env'
import type { Metadata, Viewport } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_BASE_URL),
  title: {
    default: 'Spliit · Share Expenses with Friends & Family',
    template: '%s · Spliit',
  },
  description:
    'Spliit is a minimalist web application to share expenses with friends and family. No ads, no account, no problem.',
  openGraph: {
    title: 'Spliit · Share Expenses with Friends & Family',
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
    title: 'Spliit · Share Expenses with Friends & Family',
    description:
      'Spliit is a minimalist web application to share expenses with friends and family. No ads, no account, no problem.',
  },
  appleWebApp: {
    capable: true,
    title: 'Spliit',
  },
  applicationName: 'Spliit',
  icons: [
    {
      url: '/android-chrome-192x192.png',
      sizes: '192x192',
      type: 'image/png',
    },
    {
      url: '/android-chrome-512x512.png',
      sizes: '512x512',
      type: 'image/png',
    },
  ],
}

export const viewport: Viewport = {
  themeColor: '#047857',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <ApplePwaSplash icon="/logo-with-text.png" color="#027756" />
      <body className="pt-16 min-h-[100dvh] flex flex-col items-stretch bg-slate-50 bg-opacity-30 dark:bg-background">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Suspense>
            <ProgressBar />
          </Suspense>
          <header className="fixed top-0 left-0 right-0 h-16 flex justify-between bg-white dark:bg-gray-950 bg-opacity-50 dark:bg-opacity-50 p-2 border-b backdrop-blur-sm z-50">
            <Link
              className="flex items-center gap-2 hover:scale-105 transition-transform"
              href="/"
            >
              <h1>
                <Image
                  src="/logo-with-text.png"
                  className="m-1 h-auto w-auto"
                  width={(35 * 522) / 180}
                  height={35}
                  alt="Spliit"
                />
              </h1>
            </Link>
            <div role="navigation" aria-label="Menu" className="flex">
              <ul className="flex items-center text-sm">
                <li>
                  <Button
                    variant="ghost"
                    asChild
                    className="-my-3 text-primary"
                  >
                    <Link href="/groups">Groups</Link>
                  </Button>
                </li>
                <li>
                  <ThemeToggle />
                </li>
              </ul>
            </div>
          </header>

          <div className="flex-1 flex flex-col">{children}</div>

          <footer className="sm:text-sm md:text-base bg-slate-50 dark:bg-card border-t p-4 mt-8 text-xs [&_a]:underline text-center">
            Splitdumb • Forked from{' '}
            <a href="https://splitt.app" target="_blank" rel="noopener">
              Spliit.app
            </a>{' '}
            • Privately hosted
          </footer>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
