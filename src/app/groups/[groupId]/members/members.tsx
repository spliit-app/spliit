'use client'

import { useCurrentGroup } from '@/app/groups/[groupId]/current-group-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { trpc } from '@/trpc/client'
import { Check, Copy, Crown, LogOut, UserMinus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

/**
 * The account side of a group: who may open it, and the invitations outstanding.
 *
 * Access and identity are separate here and the UI says so. Removing a member
 * revokes their access but keeps their participant row, because their expenses
 * still exist; the expense form keeps offering them as "paid by" until their
 * ledger is settled.
 */
export function Members() {
  const { groupId, group } = useCurrentGroup()
  const t = useTranslations('Members')
  const { toast } = useToast()

  const utils = trpc.useUtils()
  const { data, isLoading } = trpc.groups.members.list.useQuery({ groupId })

  const invite = trpc.groups.members.invite.useMutation({
    onSuccess: async () => {
      await utils.groups.members.invalidate()
      setEmail('')
    },
    onError: (error) => {
      toast({ description: error.message, variant: 'destructive' })
    },
  })
  const revokeInvite = trpc.groups.members.revokeInvite.useMutation({
    onSuccess: () => utils.groups.members.invalidate(),
  })
  const removeMember = trpc.groups.members.remove.useMutation({
    onSuccess: async () => {
      await utils.groups.members.invalidate()
      await utils.groups.invalidate()
    },
    onError: (error) => {
      toast({ description: error.message, variant: 'destructive' })
    },
  })
  const changeRole = trpc.groups.members.setRole.useMutation({
    onSuccess: () => utils.groups.members.invalidate(),
    onError: (error) => {
      toast({ description: error.message, variant: 'destructive' })
    },
  })

  const [email, setEmail] = useState('')
  const [role, setInviteRole] = useState<'MEMBER' | 'OWNER'>('MEMBER')
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  if (isLoading || !data) return null

  const isOwner = data.me.role === 'OWNER'
  const pendingInvites = data.invites.filter(
    (invite) => invite.status === 'PENDING',
  )

  const copyLink = async (token: string) => {
    await navigator.clipboard.writeText(
      `${window.location.origin}/invite/${token}`,
    )
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('membersTitle')}</CardTitle>
          <CardDescription>
            {t('membersDescription', { name: group?.name ?? '' })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y">
            {data.members.map((member) => (
              <li
                key={member.userId}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {member.user.name}
                    </span>
                    {member.role === 'OWNER' ? (
                      <Badge variant="secondary" className="gap-1">
                        <Crown className="w-3 h-3" />
                        {t('owner')}
                      </Badge>
                    ) : null}
                    {member.participantId === data.me.participantId ? (
                      <Badge variant="outline">{t('you')}</Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {member.user.email}
                    {member.participantId === null ? (
                      <span className="italic"> · {t('administrator')}</span>
                    ) : null}
                  </p>
                </div>

                {isOwner ? (
                  <div className="flex items-center gap-1">
                    {member.role === 'MEMBER' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={changeRole.isPending}
                        onClick={() =>
                          changeRole.mutate({
                            groupId,
                            userId: member.userId,
                            role: 'OWNER',
                          })
                        }
                      >
                        {t('makeOwner')}
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t('remove')}
                      disabled={removeMember.isPending}
                      onClick={() =>
                        removeMember.mutate({ groupId, userId: member.userId })
                      }
                    >
                      {member.userId === data.me.userId ? (
                        <LogOut className="w-4 h-4" />
                      ) : (
                        <UserMinus className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {isOwner ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('inviteTitle')}</CardTitle>
            <CardDescription>{t('inviteDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <form
              className="flex flex-col sm:flex-row gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                if (!email.trim()) return
                invite.mutate({ groupId, email: email.trim(), role })
              }}
            >
              <Input
                type="email"
                required
                className="text-base"
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <Select
                value={role}
                onValueChange={(value) =>
                  setInviteRole(value as 'MEMBER' | 'OWNER')
                }
              >
                <SelectTrigger className="sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">{t('roleMember')}</SelectItem>
                  <SelectItem value="OWNER">{t('roleOwner')}</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" disabled={invite.isPending}>
                {t('invite')}
              </Button>
            </form>

            {pendingInvites.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {pendingInvites.map((pending) => (
                  <li
                    key={pending.id}
                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm truncate">{pending.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('expiresOn', {
                          date: new Date(
                            pending.expiresAt,
                          ).toLocaleDateString(),
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t('copyLink')}
                        onClick={() => copyLink(pending.token)}
                      >
                        {copiedToken === pending.token ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={revokeInvite.isPending}
                        onClick={() =>
                          revokeInvite.mutate({
                            groupId,
                            inviteId: pending.id,
                          })
                        }
                      >
                        {t('revoke')}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}

            <p className="text-xs text-muted-foreground">{t('noMailNotice')}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
