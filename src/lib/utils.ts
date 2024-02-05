import { Category } from '@prisma/client'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function formatExpenseDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  })
}

export function formatCategoryForAIPrompt(category: Category) {
  return `"${category.grouping}/${category.name}" (ID: ${category.id})`
}

export function formatCurrency(currency: string, amount: number) {
  const format = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const formattedAmount = format.format(amount / 100)
  return `${currency} ${formattedAmount}`
}
