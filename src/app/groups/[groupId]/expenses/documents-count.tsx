import { ExpenseFormValues } from '@/lib/schemas'
import { Paperclip } from 'lucide-react'
import { useTranslations } from 'next-intl'

type DocumentCount = {
  documents: ExpenseFormValues['documents']
  showMidDot: Boolean
}
export function DocumentsCount({ documents, showMidDot }: DocumentCount) {
  const t = useTranslations('ExpenseCard')
  const documentsCount = documents.length
  if (documentsCount === 0) return <></>
  return (
    <>
      <div className="flex items-center">
        <Paperclip className="w-4 h-4 mr-1 mt-0.5 text-muted-foreground" />
        <span>
          {documentsCount}{' '}
          {documentsCount === 1 ? t('attachment') : t('attachments')}
        </span>
      </div>
      {showMidDot ? <span>&nbsp;&middot;&nbsp;</span> : <></>}
    </>
  )
}
