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
      <div className="flex relative">
        <Search className="absolute top-1/2 -translate-y-1/2 py-0 px-2.5 w-12" />
        <Input
          type={type}
          className={cn(
            "pl-12",
            className
          )}
          ref={ref}
          placeholder="Search for an expense"
          {...props}
        />
      </div>
    )
  }
)
SearchBar.displayName = "SearchBar"

export { SearchBar }
