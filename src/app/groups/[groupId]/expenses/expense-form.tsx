import { CategorySelector } from '@/components/category-selector'
import { CurrencySelector } from '@/components/currency-selector'
import { ExpenseDocumentsInput } from '@/components/expense-documents-input'
import { SubmitButton } from '@/components/submit-button'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Locale } from '@/i18n/request'
import { useAnalytics } from '@/lib/analytics/context'
import { defaultCurrencyList, getCurrency } from '@/lib/currency'
import {
  convertToGroupCurrency,
  convertToOriginalCurrency,
} from '@/lib/currency-conversion'
import { RecurrenceRule, SplitMode } from '@/lib/enums'
import { RuntimeFeatureFlags } from '@/lib/featureFlags'
import { useActiveUser, useCurrencyRate } from '@/lib/hooks'
import { randomId } from '@/lib/random'
import {
  ExpenseFormInput,
  ExpenseFormValues,
  SplittingOptions,
  expenseFormSchema,
} from '@/lib/schemas'
import { distributeAmount } from '@/lib/shares'
import { calculateShare } from '@/lib/totals'
import {
  amountAsDecimal,
  amountAsMinorUnits,
  cn,
  formatAmountAsDecimal,
  formatCurrency,
  getCurrencyFromGroup,
} from '@/lib/utils'
import { AppRouterOutput } from '@/trpc/routers/_app'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronRight, Save } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { match } from 'ts-pattern'
import { DeletePopup } from '../../../../components/delete-popup'
import { extractCategoryFromTitle } from '../../../../components/expense-form-actions'
import { Textarea } from '../../../../components/ui/textarea'

const enforceCurrencyPattern = (value: string) =>
  value
    .replace(/^\s*-/, '_') // replace leading minus with _
    .replace(/[.,]/, '#') // replace first comma with #
    .replace(/[-.,]/g, '') // remove other minus and commas characters
    .replace(/_/, '-') // change back _ to minus
    .replace(/#/, '.') // change back # to dot
    .replace(/[^-\d.]/g, '') // remove all non-numeric characters

const getDefaultSplittingOptions = (
  group: NonNullable<AppRouterOutput['groups']['get']['group']>,
) => {
  const defaultValue = {
    splitMode: 'EVENLY' as const,
    paidFor: group.participants.map(({ id }) => ({
      participant: id,
      shares: '1' as any, // Use string to ensure consistent schema handling
    })),
  }

  if (typeof localStorage === 'undefined') return defaultValue
  const defaultSplitMode = localStorage.getItem(
    `${group.id}-defaultSplittingOptions`,
  )
  if (defaultSplitMode === null) return defaultValue
  const parsedDefaultSplitMode = JSON.parse(
    defaultSplitMode,
  ) as SplittingOptions

  if (parsedDefaultSplitMode.paidFor === null) {
    parsedDefaultSplitMode.paidFor = defaultValue.paidFor
  }

  // if there is a participant in the default options that does not exist anymore,
  // remove the stale default splitting options
  for (const parsedPaidFor of parsedDefaultSplitMode.paidFor) {
    if (
      !group.participants.some(({ id }) => id === parsedPaidFor.participant)
    ) {
      localStorage.removeItem(`${group.id}-defaultSplittingOptions`)
      return defaultValue
    }
  }

  return {
    splitMode: parsedDefaultSplitMode.splitMode,
    paidFor: parsedDefaultSplitMode.paidFor.map((paidFor) => ({
      participant: paidFor.participant,
      shares: (paidFor.shares / 100).toString(), // Convert to string for consistent schema handling
    })),
  }
}

async function persistDefaultSplittingOptions(
  groupId: string,
  expenseFormValues: ExpenseFormValues,
) {
  if (localStorage && expenseFormValues.saveDefaultSplittingOptions) {
    const computePaidFor = (): SplittingOptions['paidFor'] => {
      if (expenseFormValues.splitMode === 'EVENLY') {
        return expenseFormValues.paidFor.map(({ participant }) => ({
          participant,
          shares: 100,
        }))
      } else if (expenseFormValues.splitMode === 'BY_AMOUNT') {
        return null
      } else {
        return expenseFormValues.paidFor
      }
    }

    const splittingOptions = {
      splitMode: expenseFormValues.splitMode,
      paidFor: computePaidFor(),
    } satisfies SplittingOptions

    localStorage.setItem(
      `${groupId}-defaultSplittingOptions`,
      JSON.stringify(splittingOptions),
    )
  }
}

export function ExpenseForm({
  group,
  categories,
  expense,
  onSubmit,
  onDelete,
  runtimeFeatureFlags,
}: {
  group: NonNullable<AppRouterOutput['groups']['get']['group']>
  categories: AppRouterOutput['categories']['list']['categories']
  expense?: AppRouterOutput['groups']['expenses']['get']['expense']
  onSubmit: (value: ExpenseFormValues, participantId?: string) => Promise<void>
  onDelete?: (participantId?: string) => Promise<void>
  runtimeFeatureFlags: RuntimeFeatureFlags
}) {
  const t = useTranslations('ExpenseForm')
  const locale = useLocale() as Locale
  const isCreate = expense === undefined
  const searchParams = useSearchParams()

  /** Whether the form was opened from a suggested reimbursement ("Mark as paid"). */
  const isRepayment = isCreate && !!searchParams.get('reimbursement')

  const getSelectedPayer = (field?: { value: string }) => {
    if (isCreate && typeof window !== 'undefined') {
      const activeUser = localStorage.getItem(`${group.id}-activeUser`)
      if (activeUser && activeUser !== 'None' && field?.value === undefined) {
        return activeUser
      }
    }
    return field?.value
  }

  const getSelectedRecurrenceRule = (field?: { value?: string }) => {
    return field?.value as RecurrenceRule
  }
  const defaultSplittingOptions = getDefaultSplittingOptions(group)
  const groupCurrency = getCurrencyFromGroup(group)
  const form = useForm<ExpenseFormInput, any, ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: expense
      ? {
          title: expense.title,
          expenseDate: expense.expenseDate ?? new Date(),
          amount: amountAsDecimal(expense.amount, groupCurrency),
          originalCurrency: expense.originalCurrency ?? group.currencyCode,
          originalAmount:
            expense.originalAmount != null
              ? formatAmountAsDecimal(
                  expense.originalAmount,
                  getCurrency(
                    expense.originalCurrency ?? group.currencyCode,
                    locale,
                    'Custom',
                  ),
                )
              : undefined,
          conversionRate: expense.conversionRate?.toNumber(),
          category: expense.categoryId,
          paidBy: expense.paidById,
          paidFor: expense.paidFor.map(({ participantId, shares }) => ({
            participant: participantId,
            shares:
              expense.splitMode === 'BY_AMOUNT'
                ? amountAsDecimal(shares, groupCurrency)
                : (shares / 100).toString(), // Convert to string to ensure consistent handling
          })),
          splitMode: (expense.splitMode as SplitMode) ?? 'EVENLY',
          saveDefaultSplittingOptions: false,
          isReimbursement: expense.isReimbursement,
          documents: expense.documents,
          notes: expense.notes ?? '',
          recurrenceRule: (expense.recurrenceRule as RecurrenceRule) ?? 'NONE',
        }
      : isRepayment
        ? {
            title: t('reimbursement'),
            expenseDate: new Date(),
            amount: amountAsDecimal(
              Number(searchParams.get('amount')) || 0,
              groupCurrency,
            ),
            originalCurrency: group.currencyCode,
            // Empty rather than undefined: the field is filled in by the conversion, and
            // switching an input from uncontrolled to controlled warns in React.
            originalAmount: '',
            conversionRate: undefined,
            category: 1, // category with Id 1 is Payment
            paidBy: searchParams.get('from') ?? undefined,
            paidFor: [
              searchParams.get('to')
                ? {
                    participant: searchParams.get('to')!,
                    shares: '1', // String for consistent form handling
                  }
                : undefined,
            ],
            isReimbursement: true,
            splitMode: defaultSplittingOptions.splitMode,
            saveDefaultSplittingOptions: false,
            documents: [],
            notes: '',
            recurrenceRule: RecurrenceRule.NONE,
          }
        : {
            title: searchParams.get('title') ?? '',
            expenseDate: searchParams.get('date')
              ? new Date(searchParams.get('date') as string)
              : new Date(),
            amount: Number(searchParams.get('amount')) || 0,
            originalCurrency: group.currencyCode ?? undefined,
            originalAmount: undefined,
            conversionRate: undefined,
            category: searchParams.get('categoryId')
              ? Number(searchParams.get('categoryId'))
              : 0, // category with Id 0 is General
            // paid for all, split evenly
            paidFor: defaultSplittingOptions.paidFor,
            paidBy: getSelectedPayer(),
            isReimbursement: false,
            splitMode: defaultSplittingOptions.splitMode,
            saveDefaultSplittingOptions: false,
            documents: searchParams.get('imageUrl')
              ? [
                  {
                    id: randomId(),
                    url: searchParams.get('imageUrl') as string,
                    width: Number(searchParams.get('imageWidth')),
                    height: Number(searchParams.get('imageHeight')),
                  },
                ]
              : [],
            notes: '',
            recurrenceRule: RecurrenceRule.NONE,
          },
  })
  const [isCategoryLoading, setCategoryLoading] = useState(false)
  const activeUserId = useActiveUser(group.id)
  const sendEvent = useAnalytics()

  const submit = async (values: ExpenseFormValues) => {
    sendEvent(
      { event: expense ? 'expense: update' : 'expense: create', props: {} },
      `/groups/${group.id}/expenses`,
    )

    await persistDefaultSplittingOptions(group.id, values)

    // Store monetary amounts in minor units (cents)
    values.amount = amountAsMinorUnits(values.amount, groupCurrency)
    values.paidFor = values.paidFor.map(({ participant, shares }) => ({
      participant,
      shares:
        values.splitMode === 'BY_AMOUNT'
          ? amountAsMinorUnits(shares, groupCurrency)
          : shares,
    }))

    // Currency should be blank if same as group currency, or if no conversion took place
    if (conversionRequired && values.originalAmount !== undefined) {
      values.originalAmount = amountAsMinorUnits(
        values.originalAmount,
        originalCurrency,
      )
    } else {
      delete values.originalAmount
      delete values.originalCurrency
      // Without this a repayment whose converted amount rounded to zero would
      // still be saved with a rate but no amount to apply it to.
      delete values.conversionRate
    }
    return onSubmit(values, activeUserId ?? undefined)
  }

  const [isIncome, setIsIncome] = useState(Number(form.getValues().amount) < 0)
  const [manuallyEditedParticipants, setManuallyEditedParticipants] = useState<
    Set<string>
  >(new Set())

  const sExpense = isIncome ? 'Income' : 'Expense'

  const originalCurrency = getCurrency(
    form.getValues('originalCurrency'),
    locale,
    'Custom',
  )
  const exchangeRate = useCurrencyRate(
    form.watch('expenseDate') as Date,
    form.watch('originalCurrency') ?? '',
    groupCurrency.code,
  )

  const conversionRequired =
    group.currencyCode &&
    group.currencyCode.length &&
    originalCurrency.code.length &&
    originalCurrency.code !== group.currencyCode

  /**
   * Which of the two amount fields drives the other.
   *
   * For a regular expense the user enters what they spent in the original currency and the
   * group-currency amount follows. For a repayment it is the other way around: the
   * group-currency amount is the balance being settled, and the original amount is the
   * amount to actually transfer, derived from it.
   */
  const convertFromGroupCurrency = !!form.watch('isReimbursement')

  useEffect(() => {
    setManuallyEditedParticipants(new Set())
  }, [form.watch('splitMode'), form.watch('amount')])

  useEffect(() => {
    const splitMode = form.getValues().splitMode

    // Only auto-balance for split mode 'Unevenly - By amount'
    if (
      splitMode === 'BY_AMOUNT' &&
      (form.getFieldState('paidFor').isDirty ||
        form.getFieldState('amount').isDirty)
    ) {
      const totalAmount = Number(form.getValues().amount) || 0
      const paidFor = form.getValues().paidFor
      let newPaidFor = [...paidFor]

      const editedParticipants = Array.from(manuallyEditedParticipants)
      let remainingAmount = totalAmount
      let remainingParticipants = newPaidFor.length - editedParticipants.length

      newPaidFor = newPaidFor.map((participant) => {
        if (editedParticipants.includes(participant.participant)) {
          const participantShare = Number(participant.shares) || 0
          if (splitMode === 'BY_AMOUNT') {
            remainingAmount -= participantShare
          }
          return participant
        }
        return participant
      })

      if (remainingParticipants > 0) {
        // Apportion in minor units so the auto-filled amounts add up to the
        // total exactly. Dividing and rounding each one independently makes
        // 95 across three participants come out as 31.67 three times, which
        // the "amounts must add up" validation then rejects.
        const amountsPerRemaining = distributeAmount(
          amountAsMinorUnits(remainingAmount, groupCurrency),
          remainingParticipants,
        )

        let remainingIndex = 0
        newPaidFor = newPaidFor.map((participant) => {
          if (!editedParticipants.includes(participant.participant)) {
            return {
              ...participant,
              shares: formatAmountAsDecimal(
                amountsPerRemaining[remainingIndex++],
                groupCurrency,
              ), // Keep as string for consistent schema handling
            }
          }
          return participant
        })
      }
      form.setValue('paidFor', newPaidFor, { shouldValidate: true })
    }
  }, [
    manuallyEditedParticipants,
    form.watch('amount'),
    form.watch('splitMode'),
  ])

  const [usingCustomConversionRate, setUsingCustomConversionRate] = useState(
    !!form.formState.defaultValues?.conversionRate,
  )

  useEffect(() => {
    if (!usingCustomConversionRate && exchangeRate.data) {
      form.setValue('conversionRate', exchangeRate.data)
    }
  }, [exchangeRate.data, usingCustomConversionRate])

  // Original currency -> group currency, for regular expenses.
  useEffect(() => {
    if (convertFromGroupCurrency || !conversionRequired) return
    if (!form.getFieldState('originalAmount').isTouched) return
    const originalAmount = form.getValues('originalAmount') ?? 0
    const conversionRate = form.getValues('conversionRate')

    if (conversionRate && originalAmount) {
      const converted = convertToGroupCurrency(
        Number(originalAmount),
        Number(conversionRate),
        groupCurrency,
      )
      if (converted !== null) {
        const v = enforceCurrencyPattern(converted)
        const income = Number(v) < 0
        setIsIncome(income)
        if (income) form.setValue('isReimbursement', false)
        form.setValue('amount', Number(v))
      }
    }
  }, [
    form.watch('originalAmount'),
    form.watch('conversionRate'),
    form.getFieldState('originalAmount').isTouched,
    convertFromGroupCurrency,
    conversionRequired,
  ])

  // Group currency -> original currency, for repayments: the group-currency amount settles
  // the balance, and the original amount is what the user actually transfers.
  useEffect(() => {
    if (!convertFromGroupCurrency || !conversionRequired) return
    // When editing an existing expense, leave the stored amount alone until the user
    // changes something that the conversion depends on.
    if (
      !isCreate &&
      !form.getFieldState('amount').isDirty &&
      !form.getFieldState('originalCurrency').isDirty &&
      !form.getFieldState('conversionRate').isDirty
    )
      return

    const converted = convertToOriginalCurrency(
      Number(form.getValues('amount')),
      Number(form.getValues('conversionRate')),
      originalCurrency,
    )
    if (converted !== null) {
      // A tiny balance can round down to zero in the original currency, which the schema
      // rejects. Leave the field empty rather than block a form the user cannot correct.
      form.setValue(
        'originalAmount',
        // String for consistent form handling, so trailing zeros survive; the schema
        // coerces it, and it maps '' back to undefined.
        Number(converted) === 0 ? '' : enforceCurrencyPattern(converted),
      )
    }
  }, [
    form.watch('amount'),
    form.watch('conversionRate'),
    convertFromGroupCurrency,
    conversionRequired,
    originalCurrency.code,
    isCreate,
  ])

  let conversionRateMessage = ''
  if (exchangeRate.isLoading) {
    conversionRateMessage = t('conversionRateState.loading')
  } else {
    let ratesDisplay = ''
    if (exchangeRate.data) {
      // non breaking spaces so the rate text is not split with line feeds
      ratesDisplay = `${form.getValues('originalCurrency')}\xa01\xa0=\xa0${
        group.currencyCode
      }\xa0${exchangeRate.data}`
    }
    if (exchangeRate.error) {
      if (exchangeRate.error instanceof RangeError && exchangeRate.data)
        conversionRateMessage = t('conversionRateState.dateMismatch', {
          date: exchangeRate.error.message,
        })
      else {
        conversionRateMessage = t('conversionRateState.error')
      }
      conversionRateMessage +=
        ' ' +
        (ratesDisplay.length
          ? `${t('conversionRateState.staleRate')} ${ratesDisplay}`
          : t('conversionRateState.noRate'))
    } else {
      conversionRateMessage = ratesDisplay.length
        ? `${t('conversionRateState.success')} ${ratesDisplay}`
        : t('conversionRateState.currencyNotFound')
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)}>
        <Card>
          <CardHeader>
            <CardTitle>
              {t(`${sExpense}.${isCreate ? 'create' : 'edit'}`)}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="">
                  <FormLabel>{t(`${sExpense}.TitleField.label`)}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t(`${sExpense}.TitleField.placeholder`)}
                      className="text-base"
                      {...field}
                      onBlur={async () => {
                        field.onBlur() // avoid skipping other blur event listeners since we overwrite `field`
                        // Skip empty titles: tabbing through the field would
                        // otherwise spend an API call to categorise "".
                        if (
                          runtimeFeatureFlags.enableCategoryExtract &&
                          field.value.trim()
                        ) {
                          setCategoryLoading(true)
                          const { categoryId } = await extractCategoryFromTitle(
                            field.value,
                          )
                          form.setValue('category', categoryId)
                          setCategoryLoading(false)
                        }
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    {t(`${sExpense}.TitleField.description`)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expenseDate"
              render={({ field }) => (
                <FormItem className="sm:order-1">
                  <FormLabel>{t(`${sExpense}.DateField.label`)}</FormLabel>
                  <FormControl>
                    <Input
                      className="date-base"
                      type="date"
                      defaultValue={formatDate(field.value as Date)}
                      onChange={(event) => {
                        return field.onChange(new Date(event.target.value))
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    {t(`${sExpense}.DateField.description`)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="originalCurrency"
              render={({ field: { onChange, ...field } }) => (
                <FormItem className="sm:order-3">
                  <FormLabel>{t(`${sExpense}.currencyField.label`)}</FormLabel>
                  <FormControl>
                    {group.currencyCode ? (
                      <CurrencySelector
                        currencies={defaultCurrencyList(locale, '')}
                        defaultValue={form.watch(field.name) ?? ''}
                        isLoading={false}
                        onValueChange={(v) => onChange(v)}
                      />
                    ) : (
                      <Input
                        className="text-base"
                        disabled={true}
                        {...field}
                        placeholder={group.currency}
                      />
                    )}
                  </FormControl>
                  <FormDescription>
                    {t(`${sExpense}.currencyField.description`)}{' '}
                    {!group.currencyCode && t('conversionUnavailable')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div
              className={cn(
                convertFromGroupCurrency ? 'sm:order-5' : 'sm:order-4',
                !conversionRequired && 'max-sm:hidden sm:invisible',
                'col-span-2 md:col-span-1 space-y-2',
              )}
            >
              <FormField
                control={form.control}
                name="originalAmount"
                render={({ field: { onChange, ...field } }) => (
                  <FormItem>
                    <FormLabel>
                      {t(
                        convertFromGroupCurrency
                          ? 'originalAmountField.repaymentLabel'
                          : 'originalAmountField.label',
                      )}
                    </FormLabel>
                    <div className="flex items-baseline gap-2">
                      <span>{originalCurrency.symbol}</span>
                      <FormControl>
                        <Input
                          className={cn(
                            'text-base max-w-[120px]',
                            // Derived from the amount being settled: still selectable so it
                            // can be copied, but not meant to be edited directly.
                            convertFromGroupCurrency &&
                              'bg-muted text-muted-foreground',
                          )}
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          readOnly={convertFromGroupCurrency}
                          onChange={(event) => {
                            const v = enforceCurrencyPattern(event.target.value)
                            onChange(v)
                          }}
                          {...field}
                          onFocus={(e) => {
                            const target = e.currentTarget
                            setTimeout(() => target.select(), 1)
                          }}
                        />
                      </FormControl>
                    </div>
                    {convertFromGroupCurrency && (
                      <FormDescription>
                        {t('originalAmountField.repaymentDescription')}
                      </FormDescription>
                    )}
                    <FormDescription>
                      {isNaN(
                        (form.getValues('expenseDate') as Date).getTime(),
                      ) ? (
                        t('conversionRateState.noDate')
                      ) : form.getValues('expenseDate') &&
                        !usingCustomConversionRate ? (
                        <>
                          {conversionRateMessage}
                          {!exchangeRate.isLoading && (
                            <Button
                              className="h-auto py-0"
                              // Without this the button inherits type="submit"
                              // and refreshing the rate submits the form.
                              type="button"
                              variant="link"
                              onClick={() => exchangeRate.refresh()}
                            >
                              {t('conversionRateState.refresh')}
                            </Button>
                          )}
                        </>
                      ) : (
                        t('conversionRateState.customRate')
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Collapsible
                open={usingCustomConversionRate}
                onOpenChange={setUsingCustomConversionRate}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="link" className="-mx-4">
                    {usingCustomConversionRate
                      ? t('conversionRateField.useApi')
                      : t('conversionRateField.useCustom')}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <FormField
                    control={form.control}
                    name="conversionRate"
                    render={({ field: { onChange, ...field } }) => (
                      <FormItem
                        className={`sm:order-4 ${
                          !conversionRequired
                            ? 'max-sm:hidden sm:invisible'
                            : ''
                        }`}
                      >
                        <FormLabel>{t('conversionRateField.label')}</FormLabel>
                        <div className="flex items-baseline gap-2">
                          <span>
                            {originalCurrency.symbol} 1 = {group.currency}
                          </span>
                          <FormControl>
                            <Input
                              className="text-base max-w-[120px]"
                              type="text"
                              inputMode="decimal"
                              placeholder="0.00"
                              onChange={(event) => {
                                const v = enforceCurrencyPattern(
                                  event.target.value,
                                )
                                onChange(v)
                              }}
                              {...field}
                              onFocus={(e) => {
                                const target = e.currentTarget
                                setTimeout(() => target.select(), 1)
                              }}
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CollapsibleContent>
              </Collapsible>
            </div>
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem className="sm:order-2">
                  <FormLabel>{t('categoryField.label')}</FormLabel>
                  <CategorySelector
                    categories={categories}
                    defaultValue={
                      form.watch(field.name) as number // may be overwritten externally
                    }
                    onValueChange={field.onChange}
                    isLoading={isCategoryLoading}
                  />
                  <FormDescription>
                    {t(`${sExpense}.categoryFieldDescription`)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field: { onChange, ...field } }) => (
                <FormItem
                  className={
                    convertFromGroupCurrency ? 'sm:order-4' : 'sm:order-5'
                  }
                >
                  <FormLabel>{t('amountField.label')}</FormLabel>
                  <div className="flex items-baseline gap-2">
                    <span>{group.currency}</span>
                    <FormControl>
                      <Input
                        className="text-base max-w-[120px]"
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        onChange={(event) => {
                          const v = enforceCurrencyPattern(event.target.value)
                          const income = Number(v) < 0
                          setIsIncome(income)
                          if (income) form.setValue('isReimbursement', false)
                          onChange(v)
                        }}
                        onFocus={(e) => {
                          // we're adding a small delay to get around safaris issue with onMouseUp deselecting things again
                          const target = e.currentTarget
                          setTimeout(() => target.select(), 1)
                        }}
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />

                  {!isIncome && (
                    <FormField
                      control={form.control}
                      name="isReimbursement"
                      render={({ field }) => (
                        <FormItem className="flex flex-row gap-2 items-center space-y-0 pt-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div>
                            <FormLabel>
                              {t('isReimbursementField.label')}
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paidBy"
              render={({ field }) => (
                <FormItem className="sm:order-5">
                  <FormLabel>{t(`${sExpense}.paidByField.label`)}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={getSelectedPayer(field)}
                  >
                    <SelectTrigger data-testid="paid-by">
                      <SelectValue
                        placeholder={t(`${sExpense}.paidByField.placeholder`)}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {group.participants.map(({ id, name }) => (
                        <SelectItem key={id} value={id}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t(`${sExpense}.paidByField.description`)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="sm:order-6">
                  <FormLabel>{t('notesField.label')}</FormLabel>
                  <FormControl>
                    <Textarea className="text-base" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="recurrenceRule"
              render={({ field }) => (
                <FormItem className="sm:order-5">
                  <FormLabel>{t(`${sExpense}.recurrenceRule.label`)}</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      form.setValue('recurrenceRule', value as RecurrenceRule)
                    }}
                    defaultValue={getSelectedRecurrenceRule(field)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="NONE" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">
                        {t(`${sExpense}.recurrenceRule.none`)}
                      </SelectItem>
                      <SelectItem value="DAILY">
                        {t(`${sExpense}.recurrenceRule.daily`)}
                      </SelectItem>
                      <SelectItem value="WEEKLY">
                        {t(`${sExpense}.recurrenceRule.weekly`)}
                      </SelectItem>
                      <SelectItem value="MONTHLY">
                        {t(`${sExpense}.recurrenceRule.monthly`)}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t(`${sExpense}.recurrenceRule.description`)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex justify-between">
              <span>{t(`${sExpense}.paidFor.title`)}</span>
              <Button
                variant="link"
                type="button"
                className="-my-2 -mx-4"
                onClick={() => {
                  const paidFor = form.getValues().paidFor
                  const allSelected =
                    paidFor.length === group.participants.length
                  const newPaidFor = allSelected
                    ? []
                    : group.participants.map((p) => ({
                        participant: p.id,
                        shares:
                          paidFor.find((pfor) => pfor.participant === p.id)
                            ?.shares ?? '1', // Use string to ensure consistent schema handling
                      }))
                  form.setValue('paidFor', newPaidFor, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  })
                }}
              >
                {form.getValues().paidFor.length ===
                group.participants.length ? (
                  <>{t('selectNone')}</>
                ) : (
                  <>{t('selectAll')}</>
                )}
              </Button>
            </CardTitle>
            <CardDescription>
              {t(`${sExpense}.paidFor.description`)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="paidFor"
              render={() => (
                <FormItem className="sm:order-4 row-span-2 space-y-0">
                  {group.participants.map(({ id, name }) => (
                    <FormField
                      key={id}
                      control={form.control}
                      name="paidFor"
                      render={({ field }) => {
                        return (
                          <div
                            data-id={`${id}/${form.getValues().splitMode}/${
                              group.currency
                            }`}
                            className="flex flex-wrap gap-y-4 items-center border-t last-of-type:border-b last-of-type:!mb-4 -mx-6 px-6 py-3"
                          >
                            <FormItem className="flex-1 flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.some(
                                    ({ participant }) => participant === id,
                                  )}
                                  onCheckedChange={(checked) => {
                                    const options = {
                                      shouldDirty: true,
                                      shouldTouch: true,
                                      shouldValidate: true,
                                    }
                                    checked
                                      ? form.setValue(
                                          'paidFor',
                                          [
                                            ...field.value,
                                            {
                                              participant: id,
                                              shares: '1', // Use string to ensure consistent schema handling
                                            },
                                          ],
                                          options,
                                        )
                                      : form.setValue(
                                          'paidFor',
                                          field.value?.filter(
                                            (value) => value.participant !== id,
                                          ),
                                          options,
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal flex-1">
                                {name}
                                {field.value?.some(
                                  ({ participant }) => participant === id,
                                ) &&
                                  !form.watch('isReimbursement') && (
                                    <span className="text-muted-foreground ml-2">
                                      (
                                      {formatCurrency(
                                        groupCurrency,
                                        calculateShare(id, {
                                          // A new expense has no id yet — ids
                                          // are minted server-side — so the
                                          // leftover minor unit of an uneven
                                          // split may land on a different
                                          // participant once it is saved. When
                                          // editing, this makes the amounts
                                          // here match the balances tab.
                                          id: expense?.id,
                                          amount: amountAsMinorUnits(
                                            Number(form.watch('amount')),
                                            groupCurrency,
                                          ), // Convert to cents
                                          paidFor: field.value.map(
                                            ({ participant, shares }) => ({
                                              participant: {
                                                id: participant,
                                                name: '',
                                                groupId: '',
                                              },
                                              shares:
                                                form.watch('splitMode') ===
                                                'BY_PERCENTAGE'
                                                  ? Number(shares) * 100 // Convert percentage to basis points (e.g., 50% -> 5000)
                                                  : form.watch('splitMode') ===
                                                      'BY_AMOUNT'
                                                    ? amountAsMinorUnits(
                                                        Number(shares),
                                                        groupCurrency,
                                                      )
                                                    : Number(shares),
                                              expenseId: '',
                                              participantId: '',
                                            }),
                                          ),
                                          splitMode: form.watch(
                                            'splitMode',
                                          ) as SplitMode,
                                          isReimbursement:
                                            form.watch('isReimbursement'),
                                        }),
                                        locale,
                                      )}
                                      )
                                    </span>
                                  )}
                              </FormLabel>
                            </FormItem>
                            <div className="flex flex-wrap justify-end gap-y-2">
                              {form.getValues().splitMode === 'BY_AMOUNT' &&
                                !!conversionRequired && (
                                  <FormField
                                    name={`paidFor[${field.value.findIndex(
                                      ({ participant }) => participant === id,
                                    )}].originalAmount`}
                                    render={() => {
                                      const sharesLabel = (
                                        <span
                                          className={cn('text-sm', {
                                            'text-muted': !field.value?.some(
                                              ({ participant }) =>
                                                participant === id,
                                            ),
                                          })}
                                        >
                                          {originalCurrency.symbol}
                                        </span>
                                      )
                                      return (
                                        <div>
                                          <div className="flex gap-1 items-center">
                                            {sharesLabel}
                                            <FormControl>
                                              <Input
                                                key={String(
                                                  !field.value?.some(
                                                    ({ participant }) =>
                                                      participant === id,
                                                  ),
                                                )}
                                                className="text-base w-[80px] -my-2"
                                                type="text"
                                                inputMode="decimal"
                                                disabled={
                                                  !field.value?.some(
                                                    ({ participant }) =>
                                                      participant === id,
                                                  )
                                                }
                                                value={
                                                  field.value.find(
                                                    ({ participant }) =>
                                                      participant === id,
                                                  )?.originalAmount ?? ''
                                                }
                                                onChange={(event) => {
                                                  const originalAmount = Number(
                                                    event.target.value,
                                                  )
                                                  let convertedAmount = ''
                                                  if (
                                                    !Number.isNaN(
                                                      originalAmount,
                                                    ) &&
                                                    exchangeRate.data
                                                  ) {
                                                    convertedAmount = (
                                                      originalAmount *
                                                      exchangeRate.data
                                                    ).toFixed(
                                                      groupCurrency.decimal_digits,
                                                    )
                                                  }
                                                  field.onChange(
                                                    field.value.map((p) =>
                                                      p.participant === id
                                                        ? {
                                                            participant: id,
                                                            originalAmount:
                                                              event.target
                                                                .value,
                                                            shares:
                                                              enforceCurrencyPattern(
                                                                convertedAmount,
                                                              ),
                                                          }
                                                        : p,
                                                    ),
                                                  )
                                                  setManuallyEditedParticipants(
                                                    (prev) =>
                                                      new Set(prev).add(id),
                                                  )
                                                }}
                                                step={
                                                  10 **
                                                  -originalCurrency.decimal_digits
                                                }
                                              />
                                            </FormControl>
                                            <ChevronRight className="h-4 w-4 mx-1 opacity-50" />
                                          </div>
                                        </div>
                                      )
                                    }}
                                  />
                                )}
                              {form.getValues().splitMode !== 'EVENLY' && (
                                <FormField
                                  name={`paidFor[${field.value.findIndex(
                                    ({ participant }) => participant === id,
                                  )}].shares`}
                                  render={() => {
                                    const sharesLabel = (
                                      <span
                                        className={cn('text-sm', {
                                          'text-muted': !field.value?.some(
                                            ({ participant }) =>
                                              participant === id,
                                          ),
                                        })}
                                      >
                                        {match(form.getValues().splitMode)
                                          .with('BY_SHARES', () => (
                                            <>{t('shares')}</>
                                          ))
                                          .with('BY_PERCENTAGE', () => <>%</>)
                                          .with('BY_AMOUNT', () => (
                                            <>{group.currency}</>
                                          ))
                                          .otherwise(() => (
                                            <></>
                                          ))}
                                      </span>
                                    )
                                    return (
                                      <div>
                                        <div className="flex gap-1 items-center">
                                          {form.getValues().splitMode ===
                                            'BY_AMOUNT' && sharesLabel}
                                          <FormControl>
                                            <Input
                                              key={String(
                                                !field.value?.some(
                                                  ({ participant }) =>
                                                    participant === id,
                                                ),
                                              )}
                                              className="text-base w-[80px] -my-2"
                                              type="text"
                                              disabled={
                                                !field.value?.some(
                                                  ({ participant }) =>
                                                    participant === id,
                                                )
                                              }
                                              value={
                                                field.value?.find(
                                                  ({ participant }) =>
                                                    participant === id,
                                                )?.shares
                                              }
                                              onChange={(event) => {
                                                field.onChange(
                                                  field.value.map((p) =>
                                                    p.participant === id
                                                      ? {
                                                          participant: id,
                                                          shares:
                                                            enforceCurrencyPattern(
                                                              event.target
                                                                .value,
                                                            ),
                                                        }
                                                      : p,
                                                  ),
                                                )
                                                setManuallyEditedParticipants(
                                                  (prev) =>
                                                    new Set(prev).add(id),
                                                )
                                              }}
                                              inputMode={
                                                form.getValues().splitMode ===
                                                'BY_AMOUNT'
                                                  ? 'decimal'
                                                  : 'numeric'
                                              }
                                              step={
                                                form.getValues().splitMode ===
                                                'BY_AMOUNT'
                                                  ? 10 **
                                                    -groupCurrency.decimal_digits
                                                  : 1
                                              }
                                            />
                                          </FormControl>
                                          {[
                                            'BY_SHARES',
                                            'BY_PERCENTAGE',
                                          ].includes(
                                            form.getValues().splitMode!,
                                          ) && sharesLabel}
                                        </div>
                                        <FormMessage className="float-right" />
                                      </div>
                                    )
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        )
                      }}
                    />
                  ))}
                  <FormMessage />
                </FormItem>
              )}
            />

            <Collapsible
              className="mt-5"
              defaultOpen={form.getValues().splitMode !== 'EVENLY'}
            >
              <CollapsibleTrigger asChild>
                <Button variant="link" className="-mx-4">
                  {t('advancedOptions')}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid sm:grid-cols-2 gap-6 pt-3">
                  <FormField
                    control={form.control}
                    name="splitMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('SplitModeField.label')}</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={(value) => {
                              form.setValue('splitMode', value as any, {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true,
                              })
                            }}
                            defaultValue={field.value}
                          >
                            <SelectTrigger data-testid="split-mode">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="EVENLY">
                                {t('SplitModeField.evenly')}
                              </SelectItem>
                              <SelectItem value="BY_SHARES">
                                {t('SplitModeField.byShares')}
                              </SelectItem>
                              <SelectItem value="BY_PERCENTAGE">
                                {t('SplitModeField.byPercentage')}
                              </SelectItem>
                              <SelectItem value="BY_AMOUNT">
                                {t('SplitModeField.byAmount')}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormDescription>
                          {t(`${sExpense}.splitModeDescription`)}
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="saveDefaultSplittingOptions"
                    render={({ field }) => (
                      <FormItem className="flex flex-row gap-2 items-center space-y-0 pt-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div>
                          <FormLabel>
                            {t('SplitModeField.saveAsDefault')}
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        {runtimeFeatureFlags.enableExpenseDocuments && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex justify-between">
                <span>{t('attachDocuments')}</span>
              </CardTitle>
              <CardDescription>
                {t(`${sExpense}.attachDescription`)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="documents"
                render={({ field }) => (
                  <ExpenseDocumentsInput
                    documents={field.value ?? []}
                    updateDocuments={field.onChange}
                    onDocumentAttached={() =>
                      sendEvent(
                        { event: 'expense: attach document', props: {} },
                        `/groups/${group.id}/expenses`,
                      )
                    }
                  />
                )}
              />
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row mt-4 gap-2">
          <SubmitButton
            className="w-full sm:w-auto"
            loadingContent={t(isCreate ? 'creating' : 'saving')}
          >
            <Save className="w-4 h-4 mr-2" />
            {t(isCreate ? 'create' : 'save')}
          </SubmitButton>
          {!isCreate && onDelete && (
            <DeletePopup
              onDelete={async () => {
                sendEvent(
                  { event: 'expense: delete', props: {} },
                  `/groups/${group.id}/expenses`,
                )
                await onDelete(activeUserId ?? undefined)
              }}
            ></DeletePopup>
          )}
          <Button variant="ghost" className="w-full sm:w-auto" asChild>
            <Link href={`/groups/${group.id}`}>{t('cancel')}</Link>
          </Button>
        </div>
      </form>
    </Form>
  )
}

function formatDate(date?: Date) {
  if (!date || isNaN(date as any)) date = new Date()
  return date.toISOString().substring(0, 10)
}
