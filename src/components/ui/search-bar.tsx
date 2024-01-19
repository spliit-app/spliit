import * as React from "react"

import {Input} from "@/components/ui/input";
import {cn} from "@/lib/utils";
import {
  Search
} from 'lucide-react'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const SearchBar = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <div className="mx-4 sm:mx-6 flex relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type={type}
          className={cn(
            "pl-10 text-sm focus:text-base bg-muted border-none text-muted-foreground",
            className
          )}
          ref={ref}
          placeholder="Search for an expense…"
          {...props}
        />
      </div>
    )
  }
)
SearchBar.displayName = "SearchBar"

export { SearchBar }
