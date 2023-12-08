'use client'
import { Button } from '@/components/ui/button'
import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'

type Props = { text: string }

export function CopyButton({ text }: Props) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (copied) {
      let timeout = setTimeout(() => setCopied(false), 1000)
      return () => {
        setCopied(false)
        clearTimeout(timeout)
      }
    }
  }, [copied])

  return (
    <Button
      size="icon"
      variant="secondary"
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
      }}
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </Button>
  )
}
