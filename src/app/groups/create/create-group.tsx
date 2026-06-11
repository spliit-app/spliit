'use client'

import { CurrencySelector } from '@/components/currency-selector'
import { GroupForm } from '@/components/group-form'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { defaultCurrencyList } from '@/lib/currency'
import { trpc } from '@/trpc/client'
import { FileDown, Loader2, Upload } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export const CreateGroup = () => {
  const { mutateAsync } = trpc.groups.create.useMutation()
  const importTricount = trpc.groups.importTricount.useMutation()
  const utils = trpc.useUtils()
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('Groups.ImportTricount')

  const [currencyCode, setCurrencyCode] = useState(
    process.env.NEXT_PUBLIC_DEFAULT_CURRENCY_CODE || 'USD',
  )
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    setError(null)

    const reader = new FileReader()
    reader.onload = async (event) => {
      const text = event.target?.result
      if (typeof text === 'string') {
        try {
          const { groupId } = await importTricount.mutateAsync({
            csvText: text,
            targetCurrencyCode: currencyCode,
          })
          await utils.groups.invalidate()
          router.push(`/groups/${groupId}`)
        } catch (err: any) {
          setError(err.message || t('error'))
          setIsImporting(false)
        }
      } else {
        setError(t('error'))
        setIsImporting(false)
      }
    }
    reader.onerror = () => {
      setError(t('error'))
      setIsImporting(false)
    }
    reader.readAsText(file)
  }

  return (
    <div className="flex flex-col gap-6">
      <GroupForm
        onSubmit={async (groupFormValues) => {
          const { groupId } = await mutateAsync({ groupFormValues })
          await utils.groups.invalidate()
          router.push(`/groups/${groupId}`)
        }}
      />

      <Card className="border-dashed border-2 hover:border-solid hover:border-primary/50 transition-all duration-300 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileDown className="w-5 h-5 text-primary animate-pulse" />
            {t('title')}
          </CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              {t('stepsTitle')}
            </h3>
            <ol className="text-xs text-muted-foreground space-y-2 list-none pl-0">
              {([1, 2, 3, 4, 5, 6] as const).map((num) => (
                <li key={num} className="flex gap-3 items-start">
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold shrink-0">
                    {num}
                  </span>
                  <span className="leading-4">{t(`step${num}` as any)}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="mb-6 space-y-2">
            <label className="text-sm font-semibold text-foreground">
              {t('currencyLabel')}
            </label>
            <CurrencySelector
              currencies={defaultCurrencyList(locale as any, 'Custom')}
              defaultValue={currencyCode}
              onValueChange={(newCurrency) => {
                setCurrencyCode(newCurrency)
              }}
              isLoading={false}
            />
            <p className="text-xs text-muted-foreground">
              {t('currencyDescription')}
            </p>
          </div>

          <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:bg-accent/50 transition-colors duration-200">
            {isImporting ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <span className="text-sm font-medium text-muted-foreground">
                  Importing group...
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-2">
                <Upload className="w-10 h-10 text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-transform duration-300" />
                <span className="text-sm font-semibold mt-2">
                  {t('button')}
                </span>
                <span className="text-xs text-muted-foreground">
                  Drag & drop or click to choose your Tricount .csv file
                </span>
              </div>
            )}
            <input
              type="file"
              accept=".csv"
              className="hidden"
              disabled={isImporting}
              onChange={handleFileChange}
            />
          </label>
          {error && (
            <p className="text-sm text-destructive font-medium mt-4 bg-destructive/10 p-3 rounded-lg border border-destructive/20">
              {error}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
