'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Locale, localeLabels } from '@/i18n'
import { setUserLocale } from '@/lib/locale'
import { useLocale } from 'next-intl'
import { useTransition } from 'react'

export function LocaleSwitcher() {
  const locale = useLocale() as Locale
  const [isPending, startTransition] = useTransition()

  const handleLocaleChange = async (newLocale: Locale) => {
    startTransition(async () => {
      try {
        await setUserLocale(newLocale)
      } catch (error) {
        console.error('Failed to change locale:', error)
      }
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="-my-3"
          disabled={isPending}
        >
          <span>{localeLabels[locale]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {Object.entries(localeLabels).map(([locale, label]) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => handleLocaleChange(locale as Locale)}
            disabled={isPending}
          >
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
