'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useMediaQuery } from '@/lib/hooks'
import { getCurrencyFromGroup } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { Loader2, Upload } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Papa from 'papaparse'
import { useRef, useState } from 'react'
import { useCurrentGroup } from '../current-group-context'

const FIXED_COLUMNS = new Set([
  'Date',
  'Description',
  'Category',
  'Cost',
  'Currency',
])

type ParsedRow = Record<string, string>

type ParsedData = {
  rows: ParsedRow[]
  participantNames: string[]
}

type ParticipantMapping = Record<string, string | undefined>

type ImportableExpense = {
  date: Date
  description: string
  categoryId: number
  amount: number
  paidBy: string
  paidFor: Array<{ participant: string; shares: number }>
}

type Step = 'upload' | 'map' | 'preview'

function matchCategory(
  categoryName: string,
  categories: Array<{ id: number; name: string; grouping: string }>,
): number {
  if (!categoryName.trim()) return 0
  const lower = categoryName.toLowerCase()
  const exact = categories.find(
    (c) =>
      c.name.toLowerCase() === lower || c.grouping.toLowerCase() === lower,
  )
  if (exact) return exact.id
  const partial = categories.find(
    (c) =>
      c.name.toLowerCase().includes(lower) ||
      lower.includes(c.name.toLowerCase()),
  )
  return partial?.id ?? 0
}

function buildExpenses(
  rows: ParsedRow[],
  participantNames: string[],
  mapping: ParticipantMapping,
  categories: Array<{ id: number; name: string; grouping: string }>,
  decimalDigits: number,
): { expenses: ImportableExpense[]; skipped: number } {
  const expenses: ImportableExpense[] = []
  let skipped = 0

  for (const row of rows) {
    const cost = parseFloat(row['Cost'] ?? '0')
    if (!cost || cost <= 0) {
      skipped++
      continue
    }

    // Find the payer: participant with the highest positive value
    let payerName: string | null = null
    let maxValue = 0
    for (const name of participantNames) {
      const val = parseFloat(row[name] ?? '0')
      if (val > 0 && val > maxValue) {
        maxValue = val
        payerName = name
      }
    }

    if (!payerName || !mapping[payerName]) {
      skipped++
      continue
    }

    const payerId = mapping[payerName]!
    const totalMinor = Math.round(cost * 10 ** decimalDigits)

    // Build paidFor entries for participants with negative values (they owe money)
    const nonPayerEntries: Array<{ participant: string; shares: number }> = []
    for (const name of participantNames) {
      if (name === payerName) continue
      if (!mapping[name]) continue
      const val = parseFloat(row[name] ?? '0')
      if (val >= 0) continue
      const shareMinor = Math.round(Math.abs(val) * 10 ** decimalDigits)
      if (shareMinor <= 0) continue
      nonPayerEntries.push({ participant: mapping[name]!, shares: shareMinor })
    }

    // Payer's share is the remainder to ensure shares sum exactly to total
    const nonPayerTotal = nonPayerEntries.reduce((s, p) => s + p.shares, 0)
    const payerShare = totalMinor - nonPayerTotal

    if (payerShare <= 0) {
      skipped++
      continue
    }

    const paidFor = [{ participant: payerId, shares: payerShare }, ...nonPayerEntries]

    const dateStr = row['Date'] ?? ''
    const date = new Date(`${dateStr}T12:00:00.000Z`)
    if (isNaN(date.getTime())) {
      skipped++
      continue
    }

    const rawDescription = (row['Description'] ?? '').trim()
    const description = rawDescription.length >= 2 ? rawDescription : 'Imported expense'

    expenses.push({
      date,
      description,
      categoryId: matchCategory(row['Category'] ?? '', categories),
      amount: totalMinor,
      paidBy: payerId,
      paidFor,
    })
  }

  return { expenses, skipped }
}

export function ImportFromSplitwiseButton() {
  const t = useTranslations('ImportFromSplitwise')
  const isDesktop = useMediaQuery('(min-width: 640px)')
  const [open, setOpen] = useState(false)

  const triggerButton = (
    <Button size="icon" variant="secondary" title={t('triggerTitle')}>
      <Upload className="w-4 h-4" />
    </Button>
  )

  const content = <ImportDialogContent onClose={() => setOpen(false)} />

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{triggerButton}</DialogTrigger>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('Dialog.title')}</DialogTitle>
            <DialogDescription className="text-left">
              {t('Dialog.description')}
            </DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t('Dialog.title')}</DrawerTitle>
          <DrawerDescription className="text-left">
            {t('Dialog.description')}
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-4">{content}</div>
      </DrawerContent>
    </Drawer>
  )
}

function ImportDialogContent({ onClose }: { onClose: () => void }) {
  const { group, groupId } = useCurrentGroup()
  const { data: categoriesData } = trpc.categories.list.useQuery()
  const categories = categoriesData?.categories ?? []
  const utils = trpc.useUtils()
  const bulkCreate = trpc.groups.expenses.bulkCreate.useMutation()
  const { toast } = useToast()
  const t = useTranslations('ImportFromSplitwise')

  const [step, setStep] = useState<Step>('upload')
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [mapping, setMapping] = useState<ParticipantMapping>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currency = group ? getCurrencyFromGroup(group) : null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    Papa.parse<ParsedRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const headers = result.meta.fields ?? []
        const participantNames = headers.filter((h) => !FIXED_COLUMNS.has(h.trim()))

        const autoMapping: ParticipantMapping = {}
        if (group) {
          for (const name of participantNames) {
            const match = group.participants.find(
              (p) => p.name.toLowerCase() === name.toLowerCase(),
            )
            if (match) autoMapping[name] = match.id
          }
        }

        setParsedData({ rows: result.data, participantNames })
        setMapping(autoMapping)
      },
      error: () => {
        toast({ title: t('parseError'), variant: 'destructive' })
      },
    })
  }

  const processedExpenses =
    parsedData && currency
      ? buildExpenses(
          parsedData.rows,
          parsedData.participantNames,
          mapping,
          categories,
          currency.decimal_digits,
        )
      : null

  const handleImport = async () => {
    if (!processedExpenses?.expenses.length) return

    const expensesFormValues = processedExpenses.expenses.map((e) => ({
      expenseDate: e.date,
      title: e.description,
      category: e.categoryId,
      amount: e.amount,
      originalCurrency: '' as const,
      paidBy: e.paidBy,
      paidFor: e.paidFor,
      splitMode: 'BY_AMOUNT' as const,
      saveDefaultSplittingOptions: false,
      isReimbursement: false,
      documents: [] as [],
      recurrenceRule: 'NONE' as const,
    }))

    try {
      await bulkCreate.mutateAsync({ groupId, expensesFormValues })
      await utils.groups.expenses.invalidate()
      toast({
        title: t('Step3.importSuccess', {
          count: processedExpenses.expenses.length,
        }),
      })
      onClose()
    } catch {
      toast({ title: t('importError'), variant: 'destructive' })
    }
  }

  if (step === 'upload') {
    return (
      <div className="space-y-4 pt-2">
        <p className="text-sm text-muted-foreground">{t('Step1.description')}</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => fileInputRef.current?.click()}
        >
          {parsedData
            ? t('Step1.fileSelected', { count: parsedData.rows.length })
            : t('Step1.selectFile')}
        </Button>
        <div className="flex justify-end">
          <Button disabled={!parsedData} onClick={() => setStep('map')}>
            {t('next')}
          </Button>
        </div>
      </div>
    )
  }

  if (step === 'map') {
    return (
      <div className="space-y-4 pt-2">
        <p className="text-sm text-muted-foreground">{t('Step2.description')}</p>
        <div className="space-y-3">
          {parsedData?.participantNames.map((name) => (
            <div key={name} className="flex items-center gap-4">
              <span className="flex-1 text-sm truncate">{name}</span>
              <Select
                value={mapping[name] ?? '__skip__'}
                onValueChange={(val) =>
                  setMapping((prev) => ({
                    ...prev,
                    [name]: val === '__skip__' ? undefined : val,
                  }))
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__skip__">
                    {t('Step2.unmapped')}
                  </SelectItem>
                  {group?.participants.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        <div className="flex justify-between">
          <Button variant="ghost" onClick={() => setStep('upload')}>
            {t('back')}
          </Button>
          <Button onClick={() => setStep('preview')}>{t('next')}</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 pt-2">
      {processedExpenses && (
        <>
          <p className="text-sm text-muted-foreground">
            {t('Step3.summary', {
              importable: processedExpenses.expenses.length,
              skipped: processedExpenses.skipped,
            })}
          </p>
          <div className="max-h-64 overflow-y-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="p-2 text-left font-medium">
                    {t('Step3.dateColumn')}
                  </th>
                  <th className="p-2 text-left font-medium">
                    {t('Step3.descriptionColumn')}
                  </th>
                  <th className="p-2 text-right font-medium">
                    {t('Step3.amountColumn')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {processedExpenses.expenses.map((e, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="p-2 whitespace-nowrap">
                      {e.date.toISOString().split('T')[0]}
                    </td>
                    <td className="p-2 max-w-48 truncate">{e.description}</td>
                    <td className="p-2 text-right">
                      {currency
                        ? (e.amount / 10 ** currency.decimal_digits).toFixed(
                            currency.decimal_digits,
                          )
                        : e.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <div className="flex justify-between">
        <Button variant="ghost" onClick={() => setStep('map')}>
          {t('back')}
        </Button>
        <Button
          disabled={
            !processedExpenses?.expenses.length || bulkCreate.isPending
          }
          onClick={handleImport}
        >
          {bulkCreate.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('Step3.importing')}
            </>
          ) : (
            t('Step3.importButton', {
              count: processedExpenses?.expenses.length ?? 0,
            })
          )}
        </Button>
      </div>
    </div>
  )
}
