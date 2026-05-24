import { ApplePwaSplash } from '@/app/apple-pwa-splash'
import { AnonymousAuthMenu } from '@/components/anonymous-auth-menu'
import { LocaleSwitcher } from '@/components/locale-switcher'
import { ProgressBarWrapper } from '@/components/progress-bar-wrapper'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/toaster'
import { env } from '@/lib/env'
import { TRPCProvider } from '@/trpc/client'
import { Analytics } from '@vercel/analytics/react'
import type { Metadata, Viewport } from 'next'
import { NextIntlClientProvider, useTranslations } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
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
  icons: {
    icon: [
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
    apple: [
      {
        url: '/logo/192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: '#047857',
}

function Content({ children }: { children: React.ReactNode }) {
  const t = useTranslations()
  return (
    <TRPCProvider>
      <header className="fixed top-0 left-0 right-0 h-14 flex items-center justify-between bg-background/90 backdrop-blur-sm border-b z-50 px-3">
        <div className="flex items-center gap-2">
          <Link
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            href="/"
          >
            <h1>
              <Image
                src="/logo-with-text.png"
                className="m-1 h-auto w-auto"
                width={(32 * 522) / 180}
                height={32}
                alt="Spliit"
                loading="eager"
              />
            </h1>
          </Link>
        </div>
        <nav role="navigation" aria-label="Menu">
          <ul className="flex items-center gap-0.5">
            <li>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-primary font-medium"
              >
                <Link href="/groups">{t('Header.groups')}</Link>
              </Button>
            </li>
            <li>
              <LocaleSwitcher />
            </li>
            <li>
              <ThemeToggle />
            </li>
            <li>
              <AnonymousAuthMenu />
            </li>
          </ul>
        </nav>
      </header>

      <div className="pt-14 flex-1 flex flex-col">{children}</div>

      <Toaster />
    </TRPCProvider>
  )
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()
  return (
    <html lang={locale} suppressHydrationWarning>
      <ApplePwaSplash icon="/logo-with-text.png" color="#027756" />
      <body className="min-h-[100dvh] flex flex-col items-stretch bg-slate-50 bg-opacity-30 dark:bg-background">
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Suspense>
              <ProgressBarWrapper />
            </Suspense>
            <Content>{children}</Content>
            <Analytics />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
