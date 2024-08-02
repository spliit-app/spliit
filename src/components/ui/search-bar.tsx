import * as React from 'react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { Search, XCircle } from 'lucide-react'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onValueChange?: (value: string) => void
}

const SearchBar = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onValueChange, ...props }, ref) => {
    const t = useTranslations('Expenses')
    const [value, _setValue] = React.useState('')

    const setValue = (v: string) => {
      _setValue(v)
      onValueChange && onValueChange(v)
    }

    return (
      <div className="mx-4 sm:mx-6 flex relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type={type}
          className={cn(
            'pl-10 text-sm focus:text-base bg-muted border-none text-muted-foreground',
            className,
          )}
          ref={ref}
          placeholder={t("searchPlaceholder")}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          {...props}
        />
        <XCircle
          className={cn(
            'absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 cursor-pointer',
            !value && 'hidden',
          )}
          onClick={() => setValue('')}
        />
      </div>
    )
  },
)
SearchBar.displayName = 'SearchBar'

export { SearchBar }
