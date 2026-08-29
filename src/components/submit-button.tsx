import { Button, ButtonProps } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { ReactNode } from 'react'
import { useFormState } from 'react-hook-form'

type Props = {
  loadingContent: ReactNode
} & ButtonProps

export function SubmitButton({ children, loadingContent, ...props }: Props) {
  const { isSubmitting } = useFormState()
  return (
    <Button type="submit" disabled={isSubmitting} {...props}>
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
