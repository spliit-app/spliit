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
