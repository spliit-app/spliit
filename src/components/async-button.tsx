'use client'
import { Button, ButtonProps } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { ReactNode, useState } from 'react'

type Props = ButtonProps & {
  action?: () => Promise<void>
  loadingContent?: ReactNode
}

export function AsyncButton({
  action,
  children,
  loadingContent,
  ...props
}: Props) {
  const [loading, setLoading] = useState(false)
  return (
    <Button
      onClick={async () => {
        try {
          setLoading(true)
          await action?.()
        } catch (err) {
          console.error(err)
        } finally {
          setLoading(false)
        }
      }}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />{' '}
          {loadingContent ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  )
}
