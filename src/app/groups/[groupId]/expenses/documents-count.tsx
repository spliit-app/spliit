import { ExpenseFormValues } from '@/lib/schemas'
import { Paperclip } from 'lucide-react'
import { useTranslations } from 'next-intl'

type DocumentCount = {
  documents: ExpenseFormValues['documents']
}
export function DocumentsCount({ documents }: DocumentCount) {
  const t = useTranslations('ExpenseCard')
  const documentsCount = documents.length
  if (documentsCount === 0) return <></>
  return (
    <div className="flex items-center">
      <Paperclip className="w-3.5 h-3.5 mr-1 mt-0.5 text-muted-foreground" />
      <span>{documentsCount}</span>
    </div>
  )
}
