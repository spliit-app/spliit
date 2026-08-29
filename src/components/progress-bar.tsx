'use client'
import { Next13ProgressBar } from 'next13-progressbar'

export function ProgressBar() {
  return (
    <Next13ProgressBar
      height="2px"
      color="#64748b"
      options={{ showSpinner: false }}
      showOnShallow
    />
  )
}
