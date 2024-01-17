import { ChevronDown } from 'lucide-react'

import { CategoryIcon } from '@/app/groups/[groupId]/expenses/category-icon'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Category } from '@prisma/client'
import { useState } from 'react'

type Props = {
  categories: Category[]
  onValueChange: (categoryId: Category['id']) => void
  defaultValue: Category['id']
}

export function CategorySelector({
  categories,
  onValueChange,
  defaultValue,
}: Props) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState<number>(defaultValue)

  const categoriesByGroup = categories.reduce<Record<string, Category[]>>(
    (acc, category) => ({
      ...acc,
      [category.grouping]: [...(acc[category.grouping] ?? []), category],
    }),
    {},
  )

  const selectedCategory =
    categories.find((category) => category.id === value) ?? categories[0]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="flex w-full justify-between"
        >
          <div className="flex items-center gap-3">
            <CategoryIcon category={selectedCategory} className="w-4 h-4" />
            {selectedCategory.name}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start">
        <Command>
          <CommandInput placeholder="Search category..." />
          <CommandEmpty>No category found.</CommandEmpty>
          <div className="w-full max-h-[300px] overflow-y-auto">
            {Object.entries(categoriesByGroup).map(
              ([group, groupCategories], index) => (
                <CommandGroup key={index} heading={group}>
                  {groupCategories.map((category) => (
                    <CommandItem
                      key={category.id}
                      value={`${category.id} ${category.grouping} ${category.name}`}
                      onSelect={(currentValue) => {
                        const id = Number(currentValue.split(' ')[0])
                        setValue(id)
                        onValueChange(id)
                        setOpen(false)
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <CategoryIcon category={category} className="w-4 h-4" />
                        {category.name}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ),
            )}
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
