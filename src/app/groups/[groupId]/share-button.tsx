'use client'

import {
  useCurrentGroup,
  useIsGroupOwner,
} from '@/app/groups/[groupId]/current-group-context'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { UserPlus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'

/**
 * Entry point for adding people.
 *
 * This used to copy the group's URL into the clipboard, which worked because
 * knowing the id *was* the permission. It no longer is: a non-member gets
 * NOT_FOUND, so a pasted link would be a dead end. Access is granted by an
 * invitation bound to an email address, which the members page hands out.
 */
export function ShareButton() {
  const t = useTranslations('Share')
  const isOwner = useIsGroupOwner()
  const { groupId } = useCurrentGroup()
  const router = useRouter()

  if (!isOwner) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          title={t('inviteTitle')}
          size="icon"
          className="flex-shrink-0"
          aria-label={t('inviteTitle')}
        >
          <UserPlus className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="[&_p]:text-sm flex flex-col gap-3">
        <p>{t('inviteDescription')}</p>
        <Button onClick={() => router.push(`/groups/${groupId}/members`)}>
          {t('manageMembers')}
        </Button>
      </PopoverContent>
    </Popover>
  )
}
