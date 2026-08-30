import { Button } from '@/components/ui/button'
import { getCurrentSession } from '@/lib/auth/session'
import { UserTier } from '@/lib/enums'
import { ShieldAlert } from 'lucide-react'
import { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AdminDashboard } from './admin-dashboard'

export const metadata: Metadata = {
  title: 'Administration · Spliit',
  description: 'Manage users and platform permissions',
}

export default async function AdminPage() {
  const session = await getCurrentSession()

  if (!session) {
    redirect('/groups')
  }

  if (session.tier !== UserTier.ADMIN) {
    return (
      <div className="max-w-md mx-auto my-16 px-4 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold mb-2">Access Denied</h1>
        <p className="text-sm text-muted-foreground mb-6">
          The Administration Dashboard is restricted to users in the
          Administrator tier. Your account is currently in the{' '}
          <strong className="text-foreground">
            {session.tier.replace('_', ' ')}
          </strong>{' '}
          tier.
        </p>
        <Button asChild>
          <Link href="/groups">Return to My Groups</Link>
        </Button>
      </div>
    )
  }

  return <AdminDashboard />
}
