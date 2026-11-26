import { AcceptInvite } from '@/app/invite/[token]/accept-invite'
import { getSession, loginPathFor } from '@/lib/auth-server'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

type Props = { params: Promise<{ token: string }> }

export async function generateMetadata() {
  const t = await getTranslations('Members')

  return { title: t('acceptTitle') }
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params

  // The invitation is bound to an email address, so the visitor has to be signed
  // in for the accept step to mean anything. Sending them through login keeps
  // them on this URL (`?next=`) and lands them back here.
  const session = await getSession()
  if (!session) redirect(loginPathFor(`/invite/${token}`))

  return <AcceptInvite token={token} signedInAs={session.user.email} />
}
