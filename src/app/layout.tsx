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

const name = 'Splitdumb'
const title = 'Splitdumb · Because Splitwise is dumb and should be free!'
const description =
  'Splitdumb is powered by Spliit, a minimalist web application to share expenses with friends and family. No ads, no account, no problem.'

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_BASE_URL),
  title: {
    default: title,
    template: `%s · ${name}`,
  },
  description: description,
  openGraph: {
    title: title,
    description: description,
    images: `/banner.png`,
    type: 'website',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    images: `/banner.png`,
    title: title,
    description: description,
  },
  appleWebApp: {
    capable: true,
    title: name,
  },
  applicationName: name,
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
      <body className="pt-20 min-h-[100dvh] flex flex-col items-stretch bg-slate-50 bg-opacity-30 dark:bg-background">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Suspense>
            <ProgressBar />
          </Suspense>
          <header className="fixed top-0 left-0 right-0 h-16 md:h-20 flex justify-between bg-white dark:bg-gray-950 bg-opacity-50 dark:bg-opacity-50 p-2 border-b backdrop-blur-sm z-50">
            <Link
              className="flex items-center gap-1 hover:scale-105 transition-transform"
              href="/"
            >
              <h1>
                <Image
                  src="/logo-with-text.png"
                  className="m-1 h-auto w-auto"
                  width={60}
                  height={60}
                  alt="Splitdumb"
                />
              </h1>
              <h1 className="font-bold text-3xl md:text-4xl landing-header">
                Split<strong>dumb</strong>
              </h1>
            </Link>
            <div role="navigation" aria-label="Menu" className="flex">
              <ul className="flex items-center text-lg md:text-2xl">
                <li>
                  <Button
                    variant="ghost"
                    asChild
                    className="-my-3 text-primary"
                  >
                    <Link href="/groups">
                      <span className="text-lg md:text-2xl">Groups</span>
                    </Link>
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
            Splitdumb • Powered by{' '}
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
