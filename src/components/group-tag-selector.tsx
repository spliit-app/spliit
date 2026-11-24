'use client'

import { TagSelector } from '@/components/tag-selector'
import { useToast } from '@/components/ui/use-toast'
import { ExpenseTag, resolveExpenseTagSelection } from '@/lib/tags'
import { trpc } from '@/trpc/client'
import { useTranslations } from 'next-intl'
import { ComponentPropsWithoutRef, forwardRef } from 'react'

type Props = Omit<ComponentPropsWithoutRef<typeof TagSelector>, 'onDelete'> & {
  groupId: string
}

export const GroupTagSelector = forwardRef<HTMLButtonElement, Props>(
  ({ groupId, ...props }, ref) => {
    const utils = trpc.useUtils()
    const { toast } = useToast()
    const t = useTranslations('Tags')
    const { mutateAsync } = trpc.groups.deleteTag.useMutation({
      onError: () =>
        toast({ variant: 'destructive', description: t('deleteError') }),
    })
    return (
      <TagSelector
        {...props}
        ref={ref}
        onDelete={async (name) => {
          await mutateAsync({ groupId, name })
          await Promise.all([
            utils.groups.tags.invalidate({ groupId }),
            utils.groups.expenses.invalidate(),
            utils.groups.stats.invalidate(),
          ])
        }}
      />
    )
  },
)
GroupTagSelector.displayName = 'GroupTagSelector'

type ExpenseProps = Omit<Props, 'options' | 'value' | 'onValueChange'> & {
  options: ExpenseTag[]
  value: ExpenseTag[]
  onValueChange: (value: ExpenseTag[]) => void
}

export const ExpenseTagSelector = forwardRef<HTMLButtonElement, ExpenseProps>(
  ({ options, value, onValueChange, ...props }, ref) => (
    <GroupTagSelector
      {...props}
      ref={ref}
      options={options.map((tag) => tag.name)}
      value={value.map((tag) => tag.name)}
      onValueChange={(names) =>
        onValueChange(resolveExpenseTagSelection(names, value, options))
      }
    />
  ),
)
ExpenseTagSelector.displayName = 'ExpenseTagSelector'
