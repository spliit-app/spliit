import { Button } from '@/components/ui/button'
import Link from 'next/link'

// FIX for https://github.com/vercel/next.js/issues/58615
// export const dynamic = 'force-dynamic'

export default function HomePage() {
  return (
    <main>
      <section className="py-16 md:py-24 lg:py-32">
        <div className="container flex max-w-screen-md flex-col items-center gap-4 text-center">
          <h1 className="!leading-none font-bold text-3xl sm:text-5xl md:text-6xl lg:text-7xl landing-header py-2">
            Share <strong>Expenses</strong> <br /> with <strong>Friends</strong>{' '}
            & <strong>Family</strong> for <strong>Free</strong>...{' '}
            <strong>Unlimited</strong>!
          </h1>
          <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
            Welcome to <strong>Splitdumb</strong>,
            <br />
            because Splitwise is dumb and should be free!
          </p>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/groups">
                <span className="md:text-lg">Go to groups</span>
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
