import { ChevronDown, Loader2 } from 'lucide-react'

import { CategoryIcon } from '@/app/groups/[groupId]/expenses/category-icon'
import { Button, ButtonProps } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useMediaQuery } from '@/lib/hooks'
import { Category } from '@prisma/client'
import { useTranslations } from 'next-intl'
import { forwardRef, useEffect, useState } from 'react'

type Props = {
  categories: Category[]
  onValueChange: (categoryId: Category['id']) => void
  /** Category ID to be selected by default. Overwriting this value will update current selection, too. */
  defaultValue: Category['id']
  isLoading: boolean
}

export function CategorySelector({
  categories,
  onValueChange,
  defaultValue,
  isLoading,
}: Props) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState<number>(defaultValue)
  const isDesktop = useMediaQuery('(min-width: 768px)')

  // allow overwriting currently selected category from outside
  useEffect(() => {
    setValue(defaultValue)
    onValueChange(defaultValue)
  }, [defaultValue])

  const selectedCategory =
    categories.find((category) => category.id === value) ?? categories[0]

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <CategoryButton
            category={selectedCategory}
            open={open}
            isLoading={isLoading}
          />
        </PopoverTrigger>
        <PopoverContent className="p-0" align="start">
          <CategoryCommand
            categories={categories}
            onValueChange={(id) => {
              setValue(id)
              onValueChange(id)
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <CategoryButton
          category={selectedCategory}
          open={open}
          isLoading={isLoading}
        />
      </DrawerTrigger>
      <DrawerContent className="p-0">
        <CategoryCommand
          categories={categories}
          onValueChange={(id) => {
            setValue(id)
            onValueChange(id)
            setOpen(false)
          }}
        />
      </DrawerContent>
    </Drawer>
  )
}

function CategoryCommand({
  categories,
  onValueChange,
}: {
  categories: Category[]
  onValueChange: (categoryId: Category['id']) => void
}) {
  const t = useTranslations('Categories')
  const categoriesByGroup = categories.reduce<Record<string, Category[]>>(
    (acc, category) => ({
      ...acc,
      [category.grouping]: [...(acc[category.grouping] ?? []), category],
    }),
    {},
  )

  return (
    <Command>
      <CommandInput placeholder={t('search')} className="text-base" />
      <CommandEmpty>{t('noCategory')}</CommandEmpty>
      <div className="w-full max-h-[300px] overflow-y-auto">
        {Object.entries(categoriesByGroup).map(
          ([group, groupCategories], index) => (
            <CommandGroup key={index} heading={t(`${group}.heading`)}>
              {groupCategories.map((category) => (
                <CommandItem
                  key={category.id}
                  value={`${category.id} ${t(
                    `${category.grouping}.heading`,
                  )} ${t(`${category.grouping}.${category.name}`)}`}
                  onSelect={(currentValue) => {
                    const id = Number(currentValue.split(' ')[0])
                    onValueChange(id)
                  }}
                >
                  <CategoryLabel category={category} />
                </CommandItem>
              ))}
            </CommandGroup>
          ),
        )}
      </div>
    </Command>
  )
}

type CategoryButtonProps = {
  category: Category
  open: boolean
  isLoading: boolean
}
const CategoryButton = forwardRef<HTMLButtonElement, CategoryButtonProps>(
  (
    { category, open, isLoading, ...props }: ButtonProps & CategoryButtonProps,
    ref,
  ) => {
    const iconClassName = 'ml-2 h-4 w-4 shrink-0 opacity-50'
    return (
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className="flex w-full justify-between"
        ref={ref}
        {...props}
      >
        <CategoryLabel category={category} />
        {isLoading ? (
          <Loader2 className={`animate-spin ${iconClassName}`} />
        ) : (
          <ChevronDown className={iconClassName} />
        )}
      </Button>
    )
  },
)
CategoryButton.displayName = 'CategoryButton'

function CategoryLabel({ category }: { category: Category }) {
  const t = useTranslations('Categories')
  return (
    <div className="flex items-center gap-3">
      <CategoryIcon category={category} className="w-4 h-4" />
      {t(`${category.grouping}.${category.name}`)}
    </div>
  )
}
