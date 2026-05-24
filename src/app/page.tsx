import { Button } from '@/components/ui/button'
import { HomeRedirect } from '@/app/home-redirect'
import { Github, Receipt, Scale, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

// FIX for https://github.com/vercel/next.js/issues/58615
// export const dynamic = 'force-dynamic'

export default function HomePage() {
  const t = useTranslations()
  return (
    <main>
      <HomeRedirect />
      <section className="py-16 md:py-24 lg:py-32">
        <div className="container flex max-w-screen-md flex-col items-center gap-6 text-center px-6">
          <h1 className="!leading-none font-bold text-3xl sm:text-4xl md:text-5xl landing-header py-2">
            {t.rich('Homepage.title', {
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </h1>
          <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
            {t.rich('Homepage.description', {
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/groups">{t('Homepage.button.groups')}</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link href="https://github.com/carnach/spliit">
                <Github className="w-4 h-4 mr-2" />
                {t('Homepage.button.github')}
              </Link>
            </Button>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 w-full text-left">
            {[
              {
                Icon: Users,
                title: 'No account needed',
                description: 'Just create a group and share the link.',
              },
              {
                Icon: Receipt,
                title: 'Track any expense',
                description: 'Split bills evenly or by custom amounts.',
              },
              {
                Icon: Scale,
                title: 'Settle up easily',
                description: 'See who owes what at a glance.',
              },
            ].map(({ Icon, title, description }) => (
              <div
                key={title}
                className="flex gap-3 p-4 rounded-xl border bg-card shadow-sm"
              >
                <div className="shrink-0 mt-0.5">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-slate-50 dark:bg-card border-t px-6 py-4 text-xs text-muted-foreground [&_a]:underline">
        <div className="flex flex-col gap-1">
          <span>{t('Footer.madeIn')}</span>
          <span>
            {t.rich('Footer.builtBy', {
              author: (txt) => (
                <a href="https://scastiel.dev" target="_blank" rel="noopener">
                  {txt}
                </a>
              ),
              source: (txt) => (
                <a
                  href="https://github.com/spliit-app/spliit/graphs/contributors"
                  target="_blank"
                  rel="noopener"
                >
                  {txt}
                </a>
              ),
            })}
          </span>
        </div>
      </footer>
    </main>
  )
}
