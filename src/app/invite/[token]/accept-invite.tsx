'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { trpc } from '@/trpc/client'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * The accept screen for an invitation link.
 *
 * Knowing the link is not enough: `accept` refuses unless the signed-in account
 * is the invited address. The mismatch is explained here rather than after a
 * failed click, so forwarding the email to a colleague produces a sentence
 * instead of a mystery.
 */
export function AcceptInvite({
  token,
  signedInAs,
}: {
  token: string
  signedInAs: string
}) {
  const t = useTranslations('Members')
  const router = useRouter()
  const utils = trpc.useUtils()
  const [error, setError] = useState<string | null>(null)

  const { data, isLoading } = trpc.invites.preview.useQuery({ token })
  const accept = trpc.invites.accept.useMutation({
    onSuccess: async ({ groupId }) => {
      await utils.groups.invalidate()
      router.push(`/groups/${groupId}`)
    },
    onError: (mutationError) => setError(mutationError.message),
  })

  if (isLoading) return null

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('acceptTitle')}</CardTitle>
          <CardDescription>{t('notFound')}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const { invite } = data

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('acceptTitle')}</CardTitle>
        <CardDescription>
          {t('acceptDescription', { group: invite.group.name })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <p>
          <span className="text-muted-foreground">{t('invitedEmail')}: </span>
          {invite.email}
        </p>
        <p>
          <span className="text-muted-foreground">{t('signedInAs')}: </span>
          {signedInAs}
        </p>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>{t('acceptFailed')}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {invite.status !== 'PENDING' ? (
          <Alert>
            <AlertTitle>{t('notPending')}</AlertTitle>
            <AlertDescription>
              {invite.status === 'ACCEPTED'
                ? t('alreadyAccepted')
                : invite.status === 'REVOKED'
                  ? t('wasRevoked')
                  : t('wasExpired')}
            </AlertDescription>
          </Alert>
        ) : !invite.matchesAccount ? (
          <Alert variant="destructive">
            <AlertTitle>{t('wrongAccount')}</AlertTitle>
            <AlertDescription>{t('wrongAccountHint')}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
      <CardFooter>
        <Button
          disabled={
            invite.status !== 'PENDING' ||
            !invite.matchesAccount ||
            accept.isPending
          }
          onClick={() => {
            setError(null)
            accept.mutate({ token })
          }}
        >
          {t('accept')}
        </Button>
      </CardFooter>
    </Card>
  )
}
