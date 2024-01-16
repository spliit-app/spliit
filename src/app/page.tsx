import { Button } from '@/components/ui/button'
import {
  BarChartHorizontalBig,
  CircleDollarSign,
  Divide,
  FolderTree,
  Github,
  List,
  LucideIcon,
  Share,
  ShieldX,
  Users,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { ReactNode } from 'react'

// FIX for https://github.com/vercel/next.js/issues/58615
export const dynamic = 'force-dynamic'

export default function HomePage() {
  return (
    <main>
      <section className="py-16 md:py-24 lg:py-32">
        <div className="container flex max-w-screen-md flex-col items-center gap-4 text-center">
          <h1 className="!leading-none font-bold text-3xl sm:text-5xl md:text-6xl lg:text-7xl landing-header py-2">
            Share <strong>Expenses</strong> <br /> with <strong>Friends</strong>{' '}
            & <strong>Family</strong>
          </h1>
          <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
            No ads. No account. <br className="sm:hidden" /> Open Source.
            Forever Free.
          </p>
          <div className="flex gap-2">
            <Button asChild size="lg">
              <Link
                className="inline-flex items-center justify-center text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 rounded-md"
                href="/groups/create"
              >
                Create a group
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 dark:bg-card py-16 md:py-24 lg:py-32">
        <div className="p-4 flex mx-auto max-w-screen-md flex-col items-center text-center">
          <h2 className="font-bold text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
            Features
          </h2>
          <p
            className="mt-2 md:mt-3 leading-normal text-muted-foreground sm:text-lg sm:leading-7"
            style={{ textWrap: 'balance' } as any}
          >
            Spliit is a minimalist application to track and share expenses with
            your friends and family.
          </p>
          <div className="mt-8 md:mt-6 w-full grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 text-left">
            <Feature
              Icon={Users}
              name="Groups"
              description="Create a group for a travel, an event, a gift…"
            />
            <Feature
              Icon={List}
              name="Expenses"
              description="Create and list expenses in your group."
            />
            <Feature
              Icon={FolderTree}
              name="Categories"
              description="Assign categories to your expenses."
            />
            <Feature
              Icon={Divide}
              name="Advanced split"
              description="Split expenses by percentage, shares or amount."
            />
            <Feature
              Icon={Share}
              name="Share"
              description="Send the group link to participants."
            />
            <Feature
              Icon={BarChartHorizontalBig}
              name="Balances"
              description="Visualize how much each participant spent."
            />
            <Feature
              Icon={CircleDollarSign}
              name="Reimbursements"
              description="Optimize money transfers between participants."
            />
            <Feature
              Icon={ShieldX}
              name="No ads"
              description="No account. No limitation. No problem."
            />
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 lg:py-32">
        <div className="container flex max-w-screen-md flex-col items-center text-center">
          <h2 className="font-bold text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
            Proudly Open Source
          </h2>
          <p
            className="mt-2 leading-normal text-muted-foreground sm:text-lg sm:leading-7"
            style={{ textWrap: 'balance' } as any}
          >
            Spliit is open source and lives thanks to amazing{' '}
            <a
              className="underline"
              target="_blank"
              href="https://github.com/scastiel/spliit2/graphs/contributors"
            >
              contributors
            </a>
            !
          </p>
          <ul className="flex gap-4 mt-6">
            {[
              {
                avatar:
                  'https://avatars.githubusercontent.com/u/301948?s=120&v=4',
                user: 'scastiel',
                name: 'Sebastien Castiel',
              },
              {
                avatar:
                  'https://avatars.githubusercontent.com/u/3932568?s=120&v=4',
                user: 'ChristopherJohnston',
                name: 'Chris Johnston',
              },
              {
                avatar:
                  'https://avatars.githubusercontent.com/u/11523186?s=120&v=4',
                user: 'acuteengle',
                name: 'Brandon Eng',
              },
              {
                avatar:
                  'https://avatars.githubusercontent.com/u/24687853?s=120&v=4',
                user: 'Max-TheCat',
                name: 'Max',
              },
              {
                avatar:
                  'https://avatars.githubusercontent.com/u/10518723?s=120&v=4',
                user: 'ankitbahl',
                name: 'Ankit Bahl',
              },
              {
                avatar:
                  'https://avatars.githubusercontent.com/u/13032812?s=120&v=4',
                user: '174n',
                name: 'Ivan Alexandrov',
              },
            ].map((contributor) => (
              <li key={contributor.user}>
                <a
                  href={`https://github.com/${contributor.user}`}
                  target="_blank"
                  rel="nofollow"
                >
                  <Image
                    src={contributor.avatar}
                    width={60}
                    height={60}
                    alt={contributor.user}
                    className="rounded-full border hover:scale-110 transition-transform"
                  />
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-4 md:mt-6">
            <Button asChild variant="secondary" size="lg">
              <a
                target="_blank"
                rel="noreferrer"
                href="https://github.com/scastiel/spliit2"
              >
                <Github className="w-4 h-4 mr-2" />
                GitHub
              </a>
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}

function Feature({
  name,
  Icon,
  description,
}: {
  name: ReactNode
  Icon: LucideIcon
  description: ReactNode
}) {
  return (
    <div className="bg-card border rounded-md p-4 flex flex-col gap-2">
      <Icon className="w-8 h-8" />
      <div>
        <strong>{name}</strong>
      </div>
      <div
        className="text-sm text-muted-foreground"
        style={{ textWrap: 'balance' } as any}
      >
        {description}
      </div>
    </div>
  )
}
