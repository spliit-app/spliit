'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { locales } from '@/i18n'
import { setUserLocale } from '@/lib/locale'
import { useLocale, useTranslations } from 'next-intl'

export function LocaleSwitcher() {
  const t = useTranslations('Locale')
  const locale = useLocale()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="-my-3 text-primary">
          <span>{t(locale)}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {locales.map((locale) => (
          <DropdownMenuItem key={locale} onClick={() => setUserLocale(locale)}>
            {t(locale)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
