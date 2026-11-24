'use client'

import { DeletePopup } from '@/components/delete-popup'
import { TagBadge } from '@/components/tag-badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useMediaQuery } from '@/lib/hooks'
import { normalizeTagName, tagNameSchema } from '@/lib/tags'
import { ChevronDown, Trash2, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { forwardRef, useImperativeHandle, useRef, useState } from 'react'

type TagOption = { id: string; name: string }

type Props = {
  options: TagOption[]
  value: string[]
  onValueChange: (value: string[]) => void
  allowCreate?: boolean
  onDelete?: (tag: TagOption) => Promise<void>
  maxTags?: number
  disabled?: boolean
  id?: string
  onBlur?: () => void
  'aria-describedby'?: string
  'aria-invalid'?: boolean
}

export const TagSelector = forwardRef<HTMLButtonElement, Props>(
  (
    {
      options,
      value,
      onValueChange,
      allowCreate = false,
      onDelete,
      maxTags = Infinity,
      ...props
    },
    ref,
  ) => {
    const t = useTranslations('Tags')
    const label = t(allowCreate ? 'selectOrAdd' : 'select')
    const searchLabel = t(allowCreate ? 'searchOrAdd' : 'search')
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')
    const [deletingTag, setDeletingTag] = useState<TagOption | null>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)
    useImperativeHandle(ref, () => triggerRef.current!)
    const isDesktop = useMediaQuery('(min-width: 768px)')
    const normalizedSearch = normalizeTagName(search)
    const available = [
      ...new Map(
        [...options.map((tag) => tag.name), ...value].map((name) => [
          normalizeTagName(name),
          name,
        ]),
      ).values(),
    ]
    const selected = new Set(value.map(normalizeTagName))
    const atLimit = value.length >= maxTags
    const validName = tagNameSchema.safeParse(search)
    const canCreate =
      allowCreate &&
      validName.success &&
      !atLimit &&
      !available.some((name) => normalizeTagName(name) === normalizedSearch)

    const select = (name: string) => {
      const key = normalizeTagName(name)
      onValueChange(
        selected.has(key)
          ? value.filter((tag) => normalizeTagName(tag) !== key)
          : [...value, name],
      )
      setSearch('')
    }

    const trigger = (
      <Button
        {...props}
        ref={triggerRef}
        type="button"
        variant="outline"
        aria-expanded={open}
        className="w-full justify-between"
      >
        {label}
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    )
    const visible = available.filter((name) =>
      normalizeTagName(name).includes(normalizedSearch),
    )
    const command = (
      <div className="space-y-2 p-3">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={searchLabel}
          aria-label={searchLabel}
          className="text-base"
        />
        <div
          className="max-h-72 overflow-y-auto space-y-0.5"
          role="group"
          aria-label={label}
        >
          {visible.map((name) => {
            const option = options.find(
              (tag) => normalizeTagName(tag.name) === normalizeTagName(name),
            )
            return (
              <div
                key={normalizeTagName(name)}
                className="flex items-center gap-2 rounded-sm px-2 py-1 text-sm hover:bg-accent"
              >
                <label className="flex min-w-0 flex-1 items-center gap-2">
                  <Checkbox
                    checked={selected.has(normalizeTagName(name))}
                    disabled={atLimit && !selected.has(normalizeTagName(name))}
                    onCheckedChange={() => select(name)}
                  />
                  <TagBadge name={name} />
                </label>
                {onDelete && option && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    aria-label={t('delete', { name })}
                    disabled={props.disabled}
                    onClick={() => {
                      setOpen(false)
                      setDeletingTag(option)
                    }}
                  >
                    <Trash2 aria-hidden className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )
          })}
          {visible.length === 0 && !canCreate && (
            <p className="p-2 text-sm text-muted-foreground">{t('empty')}</p>
          )}
          {canCreate && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => select(validName.data!)}
            >
              {t('create', { name: validName.data! })}
            </Button>
          )}
        </div>
        {allowCreate && search && !validName.success && (
          <p className="text-sm text-destructive" role="status">
            {t('invalidName')}
          </p>
        )}
        {atLimit && (
          <p className="text-sm text-muted-foreground" role="status">
            {t('limit', { count: maxTags })}
          </p>
        )}
      </div>
    )

    return (
      <div className="space-y-2">
        <DeletePopup
          open={deletingTag !== null}
          showTrigger={false}
          onOpenChange={(open) => {
            if (!open) setDeletingTag(null)
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            triggerRef.current?.focus()
          }}
          copy={{
            title: t('deleteTitle', { name: deletingTag?.name ?? '' }),
            description: t('deleteDescription'),
            yes: t('deleteConfirm'),
            cancel: t('deleteCancel'),
            loading: t('deleting'),
          }}
          onDelete={async () => {
            if (deletingTag === null || !onDelete) return
            await onDelete(deletingTag)
            onValueChange(
              value.filter(
                (name) =>
                  normalizeTagName(name) !== normalizeTagName(deletingTag.name),
              ),
            )
            setDeletingTag(null)
          }}
        />
        {isDesktop ? (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>{trigger}</PopoverTrigger>
            <PopoverContent className="p-0" align="start">
              {command}
            </PopoverContent>
          </Popover>
        ) : (
          <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>{trigger}</DrawerTrigger>
            <DrawerContent className="p-0" aria-describedby={undefined}>
              <DrawerTitle className="sr-only">{label}</DrawerTitle>
              {command}
            </DrawerContent>
          </Drawer>
        )}
        {value.length > 0 && (
          <div className="flex flex-wrap gap-1" aria-live="polite">
            {value.map((name) => (
              <TagBadge
                key={normalizeTagName(name)}
                name={name}
                className="max-w-full gap-1"
              >
                <span className="break-all">{name}</span>
                <button
                  type="button"
                  disabled={props.disabled}
                  aria-label={t('remove', { name })}
                  onClick={() => select(name)}
                  className="rounded-sm p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X aria-hidden className="h-3 w-3" />
                </button>
              </TagBadge>
            ))}
          </div>
        )}
      </div>
    )
  },
)
TagSelector.displayName = 'TagSelector'
