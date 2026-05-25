'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Delete } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface AmountCalculatorProps {
  onApply: (value: string) => void
  initialValue?: string
  translations?: {
    applyButton: string
    keyboardHintCalculate: string
    keyboardHintApply: string
  }
}

type Operator = '+' | '-' | '×' | '÷'

const isOperator = (char: string): char is Operator =>
  ['+', '-', '×', '÷'].includes(char)

export function AmountCalculator({
  onApply,
  initialValue,
  translations,
}: AmountCalculatorProps) {
  const [display, setDisplay] = useState(initialValue || '0')
  const [hasResult, setHasResult] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Default translations if not provided
  const t = translations || {
    applyButton: 'Apply',
    keyboardHintCalculate: 'Use keyboard • Enter to calculate',
    keyboardHintApply: 'Use keyboard • Enter to apply',
  }

  const getLastChar = () => display.slice(-1)

  const appendToDisplay = useCallback(
    (value: string) => {
      setDisplay((prev) => {
        if (hasResult && !isOperator(value)) {
          setHasResult(false)
          return value === '.' ? '0.' : value
        }

        if (prev === '0' && value !== '.' && !isOperator(value)) {
          return value
        }

        const lastChar = prev.slice(-1)

        // Prevent multiple operators in a row
        if (isOperator(value) && isOperator(lastChar)) {
          return prev.slice(0, -1) + value
        }

        // Prevent multiple decimals in current number
        if (value === '.') {
          const parts = prev.split(/[+\-×÷]/)
          const currentNumber = parts[parts.length - 1]
          if (currentNumber.includes('.')) {
            return prev
          }
        }

        setHasResult(false)
        return prev + value
      })
    },
    [hasResult],
  )

  const clear = useCallback(() => {
    setDisplay('0')
    setHasResult(false)
  }, [])

  const backspace = useCallback(() => {
    setDisplay((prev) => {
      if (prev.length === 1 || hasResult) {
        setHasResult(false)
        return '0'
      }
      return prev.slice(0, -1)
    })
  }, [hasResult])

  // Safe expression evaluator without eval
  const evaluateExpression = useCallback((expr: string): number | null => {
    try {
      // Parse and evaluate the expression safely
      // Replace display operators with standard ones
      const normalized = expr.replace(/×/g, '*').replace(/÷/g, '/')

      // Remove trailing operator if present
      const cleaned = normalized.replace(/[+\-*/]$/, '')

      if (!cleaned) return null

      // Split into tokens (numbers and operators)
      const tokens: (number | string)[] = []
      let currentNumber = ''

      for (let i = 0; i < cleaned.length; i++) {
        const char = cleaned[i]
        if (char === '+' || char === '-' || char === '*' || char === '/') {
          if (currentNumber) {
            const num = parseFloat(currentNumber)
            if (isNaN(num)) return null
            tokens.push(num)
            currentNumber = ''
          }
          tokens.push(char)
        } else if ((char >= '0' && char <= '9') || char === '.') {
          currentNumber += char
        } else {
          return null // Invalid character
        }
      }

      if (currentNumber) {
        const num = parseFloat(currentNumber)
        if (isNaN(num)) return null
        tokens.push(num)
      }

      // Evaluate using operator precedence
      // First pass: handle * and /
      let i = 0
      while (i < tokens.length) {
        if (tokens[i] === '*' || tokens[i] === '/') {
          const left = tokens[i - 1] as number
          const operator = tokens[i] as string
          const right = tokens[i + 1] as number

          const result = operator === '*' ? left * right : left / right
          tokens.splice(i - 1, 3, result)
        } else {
          i++
        }
      }

      // Second pass: handle + and -
      i = 0
      while (i < tokens.length) {
        if (tokens[i] === '+' || tokens[i] === '-') {
          const left = tokens[i - 1] as number
          const operator = tokens[i] as string
          const right = tokens[i + 1] as number

          const result = operator === '+' ? left + right : left - right
          tokens.splice(i - 1, 3, result)
        } else {
          i++
        }
      }

      const result = tokens[0] as number
      return typeof result === 'number' && isFinite(result) ? result : null
    } catch {
      return null
    }
  }, [])

  const calculate = useCallback(() => {
    const result = evaluateExpression(display)
    if (result !== null) {
      // Round to 2 decimal places for currency
      const rounded = Math.round(result * 100) / 100
      setDisplay(rounded.toString())
      setHasResult(true)
    }
  }, [display, evaluateExpression])

  const handleApply = useCallback(() => {
    // Calculate first if there's a pending operation
    const lastChar = display.slice(-1)
    if (isOperator(lastChar)) {
      return
    }

    let valueToApply = display

    // If not already calculated, calculate now and use the result
    if (!hasResult && /[+\-×÷]/.test(display)) {
      const result = evaluateExpression(display)
      if (result !== null) {
        const rounded = Math.round(result * 100) / 100
        valueToApply = rounded.toString()
        // Also update display state for consistency
        setDisplay(valueToApply)
        setHasResult(true)
      }
    }

    const value = valueToApply.replace(/^0+(?=\d)/, '')
    onApply(value || '0')
  }, [display, hasResult, evaluateExpression, onApply])

  // Keyboard support - handle at container level instead of globally
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const key = e.key

      // Prevent default for calculator keys to avoid form submission etc.
      if (
        /^[0-9+\-*/.=]$/.test(key) ||
        ['Enter', 'Backspace', 'Escape', 'Delete'].includes(key)
      ) {
        e.preventDefault()
      }

      // Numbers
      if (/^[0-9]$/.test(key)) {
        appendToDisplay(key)
        return
      }

      // Operators
      switch (key) {
        case '+':
          appendToDisplay('+')
          break
        case '-':
          appendToDisplay('-')
          break
        case '*':
          appendToDisplay('×')
          break
        case '/':
          appendToDisplay('÷')
          break
        case '.':
        case ',':
          appendToDisplay('.')
          break
        case 'Enter':
          // If already calculated, apply the result; otherwise calculate
          if (hasResult) {
            handleApply()
          } else {
            calculate()
          }
          break
        case '=':
          calculate()
          break
        case 'Backspace':
          backspace()
          break
        case 'Escape':
        case 'Delete':
          clear()
          break
        case 'c':
        case 'C':
          clear()
          break
      }
    },
    [appendToDisplay, calculate, backspace, clear, hasResult, handleApply],
  )

  // Auto-focus container on mount
  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.focus()
    }
  }, [])

  const buttons: (
    | string
    | { label: React.ReactNode; value: string; className?: string }
  )[] = [
    { label: 'C', value: 'clear', className: 'text-destructive font-semibold' },
    { label: <Delete className="h-4 w-4" />, value: 'backspace' },
    '÷',
    '×',
    '7',
    '8',
    '9',
    '-',
    '4',
    '5',
    '6',
    '+',
    '1',
    '2',
    '3',
    {
      label: '=',
      value: 'equals',
      className:
        'bg-primary text-primary-foreground hover:bg-primary/90 row-span-2',
    },
    { label: '0', value: '0', className: 'col-span-2' },
    '.',
  ]

  const handleButtonClick = (btn: (typeof buttons)[number]) => {
    const value = typeof btn === 'string' ? btn : btn.value

    switch (value) {
      case 'clear':
        clear()
        break
      case 'backspace':
        backspace()
        break
      case 'equals':
        calculate()
        break
      default:
        appendToDisplay(value)
    }
  }

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="flex flex-col gap-3 w-56 outline-none"
      onKeyDown={handleKeyDown}
    >
      {/* Display */}
      <div className="bg-muted rounded-md p-3 text-right">
        <div className="text-2xl font-mono font-semibold truncate">
          {display}
        </div>
      </div>

      {/* Button Grid */}
      <div className="grid grid-cols-4 gap-1.5">
        {buttons.map((btn, index) => {
          const isString = typeof btn === 'string'
          const label = isString ? btn : btn.label
          const value = isString ? btn : btn.value
          const className = isString ? '' : btn.className

          const isOperatorBtn = typeof label === 'string' && isOperator(label)

          return (
            <Button
              key={`${value}-${index}`}
              type="button"
              variant={isOperatorBtn ? 'secondary' : 'outline'}
              className={cn(
                'h-10 text-base font-medium',
                isOperatorBtn && 'text-primary font-semibold',
                className,
              )}
              onClick={() => handleButtonClick(btn)}
            >
              {label}
            </Button>
          )
        })}
      </div>

      {/* Apply Button */}
      <Button type="button" className="w-full mt-1" onClick={handleApply}>
        {t.applyButton}
      </Button>

      {/* Keyboard hint */}
      <p className="text-xs text-muted-foreground text-center">
        {hasResult ? t.keyboardHintApply : t.keyboardHintCalculate}
      </p>
    </div>
  )
}
