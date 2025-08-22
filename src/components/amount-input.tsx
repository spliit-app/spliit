'use client'
import * as React from 'react'

import { Input, InputProps } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type Props = InputProps & {
  step?: number
  onChange: (amount: string) => void
  prefix?: string
  postfix?: string
  affixClassName?: string
}

const enforceAmountPattern = (value: string) =>
  value
    .replace(/[#_]/g, '') // remove all # and _ characters
    .replace(/^\s*-/, '_') // replace leading minus with _
    .replace(/[.,]/, '#') // replace first comma with #
    .replace(/[-.,]/g, '') // remove other minus and commas characters
    .replace(/_/, '-') // change back _ to minus
    .replace(/#/, '.') // change back # to dot
    .replace(/[^-\d.]/g, '') // remove all non-numeric characters

const AmountInput = React.forwardRef<HTMLInputElement, Props>(
  (
    {
      className,
      affixClassName,
      step = 0.01,
      prefix,
      postfix,
      onChange,
      ...props
    },
    ref,
  ) => {
    return (
      <div className="flex items-baseline gap-2">
        {prefix !== undefined && (
          <span className={cn(affixClassName)}>{prefix}</span>
        )}
        <Input
          className={cn('text-base', className)}
          type="text"
          inputMode={step >= 1 ? 'numeric' : 'decimal'}
          step={step}
          placeholder={step >= 1 ? '0' : String(step).replace(/\d/g, '0')}
          onChange={(event) =>
            onChange(enforceAmountPattern(event.target.value))
          }
          onFocus={(e) => {
            // we're adding a small delay to get around safaris issue with onMouseUp deselecting things again
            const target = e.currentTarget
            setTimeout(() => target.select(), 1)
          }}
          ref={ref}
          {...props}
        />
        {postfix !== undefined && (
          <span className={cn(affixClassName)}>{postfix}</span>
        )}
      </div>
    )
  },
)
AmountInput.displayName = 'AmountInput'

export { AmountInput }
