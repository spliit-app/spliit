import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function HomePage() {
  return (
    <main>
      <section className="py-16 md:py-24 lg:py-32">
        <div className="container flex max-w-screen-md flex-col items-center gap-4 text-center">
          <h1 className="!leading-none font-bold text-3xl sm:text-5xl md:text-6xl lg:text-7xl landing-header py-2">
            <strong>Expense</strong> Share <br /> For{' '}
            <strong>GeekyNavigator</strong>
          </h1>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/groups">Go to groups</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="https://geekynavigator.com">Create a new trip</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
