'use client'

import { TagBadge } from '@/components/tag-badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { Filter } from 'lucide-react'
import { useTranslations } from 'next-intl'

type Props = {
  tags: { id: string; name: string }[]
  value: string[]
  untagged: boolean
  onValueChange: (value: string[], untagged: boolean) => void
}

export function TagFilterButton({
  tags,
  value,
  untagged,
  onValueChange,
}: Props) {
  const t = useTranslations('Tags')
  const active = value.length > 0 || untagged

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label={t('filter')}
          title={t('filter')}
          className={cn(
            'shrink-0',
            active &&
              'bg-primary/15 text-primary ring-1 ring-primary/40 hover:bg-primary/20',
          )}
        >
          <Filter className="h-4 w-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t('filter')}</DropdownMenuLabel>
        <div className="max-h-64 overflow-y-auto">
          {tags.map((tag) => (
            <DropdownMenuCheckboxItem
              key={tag.id}
              checked={value.includes(tag.id)}
              disabled={!value.includes(tag.id) && value.length >= 200}
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={(checked) =>
                onValueChange(
                  checked
                    ? [...value, tag.id].sort()
                    : value.filter((id) => id !== tag.id),
                  false,
                )
              }
              className="break-all"
            >
              <TagBadge name={tag.name} />
            </DropdownMenuCheckboxItem>
          ))}
        </div>
        {tags.length > 0 && <DropdownMenuSeparator />}
        <DropdownMenuCheckboxItem
          checked={untagged}
          onSelect={(event) => event.preventDefault()}
          onCheckedChange={(checked) => onValueChange([], checked)}
        >
          {t('untagged')}
        </DropdownMenuCheckboxItem>
        {active && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onValueChange([], false)}>
              {t('clear')}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
