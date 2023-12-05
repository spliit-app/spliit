import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function HomePage() {
  return (
    <main>
      <Button asChild variant="link">
        <Link href="/groups">My groups</Link>
      </Button>
    </main>
  )
}
