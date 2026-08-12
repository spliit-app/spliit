'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAnalytics } from '@/lib/analytics/context'
import { Download, FileDown, FileJson } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

export default function ExportButton({ groupId }: { groupId: string }) {
  const t = useTranslations('Expenses')
  const sendEvent = useAnalytics()
  const trackExport = (format: 'csv' | 'json') =>
    sendEvent(
      { event: 'group: export expenses', props: { format } },
      `/groups/${groupId}/expenses`,
    )
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button title={t('export')} variant="secondary" size="icon">
          <Download className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem asChild>
          <Link
            prefetch={false}
            href={`/groups/${groupId}/expenses/export/json`}
            target="_blank"
            title={t('exportJson')}
            onClick={() => trackExport('json')}
          >
            <div className="flex items-center gap-2">
              <FileJson className="w-4 h-4" />
              <p>{t('exportJson')}</p>
            </div>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            prefetch={false}
            href={`/groups/${groupId}/expenses/export/csv`}
            target="_blank"
            title={t('exportCsv')}
            onClick={() => trackExport('csv')}
          >
            <div className="flex items-center gap-2">
              <FileDown className="w-4 h-4" />
              <p>{t('exportCsv')}</p>
            </div>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
