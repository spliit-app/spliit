'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Currency as CurrencyType,
  getCurrency as lookupCurrency,
} from '@/lib/currency'
import { ImportBuildResult } from '@/lib/imports/file-import'
import { formatCurrency } from '@/lib/utils'
import { useLocale, useTranslations } from 'next-intl'

export function ImportAnalysisPanel({
  previewResult,
  previewError,
}: {
  previewResult: ImportBuildResult | null
  previewError: string | null
}) {
  const t = useTranslations('FileImport')
  const locale = useLocale()

  const totalRows =
    (previewResult?.expenses.length ?? 0) + (previewResult?.errors.length ?? 0)
  const headerErrors: string[] = []
  const generalWarnings: string[] = []
  const rowErrors = previewResult?.errors ?? []
  const categoryWarnings: { row: number; label: string; message: string }[] = []
  const participantSummaries = previewResult?.participantSummaries ?? []

  let currency: CurrencyType | null = null
  const currencyCode = previewResult?.group?.currencyCode
  const currencySymbol = previewResult?.group?.currency
  if (currencyCode) {
    try {
      currency = lookupCurrency(currencyCode)
    } catch {
      currency = null
    }
  } else if (currencySymbol) {
    currency = {
      name: 'Custom',
      symbol_native: currencySymbol,
      symbol: currencySymbol,
      code: '',
      name_plural: '',
      rounding: 0,
      decimal_digits: 2,
    }
  }

  const formatSignedAmount = (amount: number) => {
    if (!currency) return t('generalInfoUnknown')
    if (amount === 0) return formatCurrency(currency, amount, locale)
    const formatted = formatCurrency(currency, Math.abs(amount), locale)
    const sign = amount > 0 ? '+' : '-'
    return `${sign}${formatted}`
  }

  const participantList = participantSummaries.map((participant, index) => (
    <span key={`${participant.name}-${index}`} className="text-sm">
      <span className="font-medium">{participant.name}</span>{' '}
      <span
        className={
          participant.balance >= 0 ? 'text-emerald-600' : 'text-destructive'
        }
      >
        ({formatSignedAmount(participant.balance)})
      </span>
      {index < participantSummaries.length - 1 ? <span>, </span> : null}
    </span>
  ))

  const totalAmount =
    previewResult?.expenses.reduce((sum, e) => sum + e.amount, 0) ?? 0
  const formattedTotalAmount =
    currency && previewResult
      ? formatCurrency(currency, totalAmount, locale)
      : t('generalInfoUnknown')

  return (
    <div className="space-y-3 pb-4">
      {previewResult ? (
        <>
          <div className="space-y-4 rounded-lg border p-4">
            <div>
              <p className="text-sm font-semibold">{t('generalInfoTitle')}</p>
              <dl className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">
                    {t('generalInfoFormat')}
                  </dt>
                  <dd className="text-sm font-medium">
                    {previewResult.format?.label ?? t('generalInfoUnknown')}
                  </dd>
                </div>
                {/* Language not available in simplified import result */}
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">
                    {t('generalInfoRows')}
                  </dt>
                  <dd className="text-sm font-medium">{totalRows}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">
                    {t('generalInfoInvalidRows')}
                  </dt>
                  <dd className="text-sm font-medium">{rowErrors.length}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">
                    {t('generalInfoTotal')}
                  </dt>
                  <dd className="text-sm font-medium">
                    {formattedTotalAmount}
                  </dd>
                </div>
              </dl>
            </div>
            <div>
              <p className="text-sm font-medium">
                {t('generalInfoParticipants')}
              </p>
              {participantSummaries.length > 0 ? (
                <p className="mt-2 space-x-1 text-sm text-muted-foreground">
                  {participantList}
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  {t('generalInfoParticipantsEmpty')}
                </p>
              )}
            </div>
          </div>

          {headerErrors.length > 0 && (
            <Alert>
              <AlertTitle>{t('analysisHeaderTitle')}</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 text-sm">
                  {headerErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {generalWarnings.length > 0 && (
            <Alert>
              <AlertTitle className="text-sm font-semibold">
                {t('analysisGeneralWarningsTitle')}
              </AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 text-sm">
                  {generalWarnings.map((warning, index) => (
                    <li key={`${warning}-${index}`}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {categoryWarnings.length > 0 && (
            <Alert>
              <AlertTitle>{t('analysisCategoryTitle')}</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 text-sm">
                  {categoryWarnings.map((warning) => (
                    <li key={`${warning.row}-${warning.label}`}>
                      {warning.label}: {warning.message}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {rowErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertTitle className="text-sm font-semibold">
                {t('analysisErrorsTitle')}
              </AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 text-sm">
                  {rowErrors.map((error) => (
                    <li key={error.row}>
                      #{error.row}: {error.message}
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-destructive-foreground">
                  {t('analysisFatalHint')}
                </p>
              </AlertDescription>
            </Alert>
          )}
        </>
      ) : (
        <Alert variant={previewError ? 'destructive' : 'default'}>
          <AlertTitle>
            {previewError ? t('previewErrorTitle') : t('analysisAwaiting')}
          </AlertTitle>
          <AlertDescription>
            <p className="text-sm">
              {previewError ? previewError : t('analysisExplanation')}
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
