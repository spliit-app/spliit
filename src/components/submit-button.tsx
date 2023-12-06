import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { PropsWithChildren, ReactNode } from 'react'
import { useFormState } from 'react-hook-form'

type Props = PropsWithChildren<{
  loadingContent: ReactNode
}>

export function SubmitButton({ children, loadingContent }: Props) {
  const { isSubmitting } = useFormState()
  return (
    <Button type="submit" disabled={isSubmitting}>
      {isSubmitting ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> {loadingContent}
        </>
      ) : (
        children
      )}
    </Button>
  )
}
