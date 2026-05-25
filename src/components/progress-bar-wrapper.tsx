'use client'

import dynamic from 'next/dynamic'

const ProgressBar = dynamic(
  () =>
    import('@/components/progress-bar').then((mod) => ({
      default: mod.ProgressBar,
    })),
  {
    ssr: false,
  },
)

export function ProgressBarWrapper() {
  return <ProgressBar />
}
