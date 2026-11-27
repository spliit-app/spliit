'use client'

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
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RecurrenceRule } from '@/generated/prisma/browser'
import { Currency } from '@/lib/currency'
import { RecurrenceRuleName } from '@/lib/recurrence'
import { ExpenseFormInput, ExpenseFormValues } from '@/lib/schemas'
import {
  getInstallmentAmounts,
  getSeriesDates,
  MAX_SERIES_OCCURRENCES,
  RecurrenceEndName,
  SeriesBounds,
  SeriesKindName,
  toDateKey,
  toMonthKey,
} from '@/lib/series'
import { amountAsMinorUnits, cn, formatCurrency } from '@/lib/utils'
import { AppRouterOutput } from '@/trpc/routers/_app'
import { CalendarClock, CreditCard, Repeat } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { UseFormReturn, useWatch } from 'react-hook-form'

type Expense = NonNullable<
  AppRouterOutput['groups']['expenses']['get']['expense']
>
type Mode = 'NONE' | SeriesKindName

/** Quick picks for the number of installments. */
const INSTALLMENT_PRESETS = [2, 3, 4, 5, 6, 10, 12]
/** How many upcoming dates to show for a series that does not end. */
const OPEN_ENDED_PREVIEW = 6
/** Longest timeline drawn; longer series are summarized. */
const TIMELINE_MAX = 48

export function RecurrenceFields({
  form,
  expense,
  groupId,
  groupCurrency,
  isIncome,
}: {
  form: UseFormReturn<ExpenseFormInput, any, ExpenseFormValues>
  expense?: Expense
  groupId: string
  groupCurrency: Currency
  isIncome: boolean
}) {
  const t = useTranslations('ExpenseForm.Recurrence')
  const tRule = useTranslations(
    `ExpenseForm.${isIncome ? 'Income' : 'Expense'}.recurrenceRule`,
  )
  const locale = useLocale()

  const series = expense?.series ?? null
  const occurrences = series?.expenses ?? []
  const lastOccurrence = occurrences.at(-1)
  const isPastOccurrence =
    !!series &&
    !!lastOccurrence &&
    (expense?.occurrenceNumber ?? 0) < (lastOccurrence.occurrenceNumber ?? 0)

  const recurrenceRule = (useWatch({
    control: form.control,
    name: 'recurrenceRule',
  }) ?? 'NONE') as RecurrenceRuleName
  const seriesKind = (useWatch({ control: form.control, name: 'seriesKind' }) ??
    'RECURRING') as SeriesKindName
  const mode: Mode = recurrenceRule === 'NONE' ? 'NONE' : seriesKind

  const setMode = (next: Mode) => {
    const options = { shouldDirty: true, shouldValidate: false }
    if (next === 'NONE') {
      form.setValue('recurrenceRule', RecurrenceRule.NONE, options)
      return
    }
    form.setValue('seriesKind', next, options)
    if (next === 'INSTALLMENTS') {
      form.setValue('recurrenceRule', RecurrenceRule.MONTHLY, options)
    } else if (recurrenceRule === 'NONE') {
      form.setValue('recurrenceRule', RecurrenceRule.MONTHLY, options)
    }
    form.clearErrors(['recurrenceOccurrences', 'recurrenceEndDate'])
  }

  // An occurrence of an existing series: it is described, and only the latest
  // one can change what comes next.
  if (series && expense) {
    const isSteerableRecurring =
      !isPastOccurrence &&
      series.kind === 'RECURRING' &&
      recurrenceRule !== 'NONE'
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {series.kind === 'INSTALLMENTS' ? (
              <CreditCard className="w-5 h-5" />
            ) : (
              <Repeat className="w-5 h-5" />
            )}
            {describeOccurrence(
              t,
              series.kind,
              expense.occurrenceNumber,
              series.occurrenceCount,
            )}
          </CardTitle>
          <CardDescription>
            <SeriesSummary
              expense={expense}
              groupCurrency={groupCurrency}
              locale={locale}
            />
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* The latest occurrence of a recurring series that goes on shows
              its past and its future in the schedule preview below. */}
          {!isSteerableRecurring && (
            <SeriesTimeline
              expense={expense}
              groupId={groupId}
              groupCurrency={groupCurrency}
              locale={locale}
            />
          )}
          {isPastOccurrence ? (
            <p className="text-sm text-muted-foreground">
              {t('pastOccurrence')}{' '}
              <Button variant="link" className="h-auto p-0" asChild>
                <Link
                  href={`/groups/${groupId}/expenses/${lastOccurrence!.id}/edit`}
                >
                  {t('goToLatest')}
                </Link>
              </Button>
            </p>
          ) : series.kind === 'INSTALLMENTS' ? (
            <InstallmentPlanControls form={form} expense={expense} />
          ) : (
            <RecurringFields
              form={form}
              recurrenceRule={recurrenceRule}
              tRule={tRule}
              allowStop
            />
          )}
          {isSteerableRecurring && (
            <SchedulePreview
              form={form}
              groupCurrency={groupCurrency}
              firstOccurrenceNumber={expense.occurrenceNumber ?? 1}
              pastItems={getRecordedTimelineItems(expense, groupId).filter(
                (item) => item.state === 'recorded',
              )}
            />
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          className="grid grid-cols-3 gap-2"
          role="radiogroup"
          aria-label={t('title')}
        >
          {(
            [
              ['NONE', CalendarClock, t('modes.none')],
              ['RECURRING', Repeat, t('modes.recurring')],
              ['INSTALLMENTS', CreditCard, t('modes.installments')],
            ] as const
          ).map(([value, Icon, label]) => (
            <Button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              data-testid={`recurrence-mode-${value}`}
              variant={mode === value ? 'default' : 'outline'}
              className="h-auto flex-col gap-1 py-3 whitespace-normal"
              onClick={() => setMode(value)}
            >
              <Icon className="w-4 h-4" />
              <span className="text-xs sm:text-sm">{label}</span>
            </Button>
          ))}
        </div>

        {mode === 'RECURRING' && (
          <RecurringFields
            form={form}
            recurrenceRule={recurrenceRule}
            tRule={tRule}
          />
        )}
        {mode === 'INSTALLMENTS' && (
          <InstallmentFields form={form} isEdit={!!expense} />
        )}
        {mode !== 'NONE' && (
          <SchedulePreview form={form} groupCurrency={groupCurrency} />
        )}
      </CardContent>
    </Card>
  )
}

function describeOccurrence(
  t: ReturnType<typeof useTranslations>,
  kind: SeriesKindName,
  number: number | null,
  count: number | null,
) {
  if (number == null)
    return t(kind === 'INSTALLMENTS' ? 'installments' : 'recurring')
  if (kind === 'INSTALLMENTS')
    return t('installmentOf', { number, count: count ?? '?' })
  return count != null
    ? t('occurrenceOf', { number, count })
    : t('occurrence', { number })
}

function RecurringFields({
  form,
  recurrenceRule,
  tRule,
  allowStop = false,
}: {
  form: UseFormReturn<ExpenseFormInput, any, ExpenseFormValues>
  recurrenceRule: RecurrenceRuleName
  tRule: ReturnType<typeof useTranslations>
  allowStop?: boolean
}) {
  const t = useTranslations('ExpenseForm.Recurrence')
  const recurrenceEnd = (useWatch({
    control: form.control,
    name: 'recurrenceEnd',
  }) ?? 'NEVER') as RecurrenceEndName

  return (
    <div className="grid sm:grid-cols-2 gap-6">
      <FormField
        control={form.control}
        name="recurrenceRule"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('frequency')}</FormLabel>
            <Select
              value={field.value ?? 'NONE'}
              onValueChange={(value) =>
                form.setValue('recurrenceRule', value as RecurrenceRule, {
                  shouldDirty: true,
                })
              }
            >
              <SelectTrigger data-testid="recurrence-rule">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allowStop && (
                  <SelectItem value="NONE">{t('stopHere')}</SelectItem>
                )}
                <SelectItem value="DAILY">{tRule('daily')}</SelectItem>
                <SelectItem value="WEEKLY">{tRule('weekly')}</SelectItem>
                <SelectItem value="MONTHLY">{tRule('monthly')}</SelectItem>
                <SelectItem value="YEARLY">{tRule('yearly')}</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {recurrenceRule !== 'NONE' && (
        <FormField
          control={form.control}
          name="recurrenceEnd"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('ends')}</FormLabel>
              <RadioGroup
                value={field.value ?? 'NEVER'}
                onValueChange={(value) => {
                  form.setValue('recurrenceEnd', value as RecurrenceEndName, {
                    shouldDirty: true,
                  })
                  form.clearErrors([
                    'recurrenceOccurrences',
                    'recurrenceEndDate',
                  ])
                }}
                className="gap-3"
              >
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="NEVER" data-testid="ends-never" />
                  {t('endsNever')}
                </label>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <label className="flex items-center gap-2">
                    <RadioGroupItem
                      value="ON_DATE"
                      data-testid="ends-on-date"
                    />
                    {t('endsOnDate')}
                  </label>
                  {recurrenceEnd === 'ON_DATE' && <EndDateInput form={form} />}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <label className="flex items-center gap-2">
                    <RadioGroupItem
                      value="AFTER_OCCURRENCES"
                      data-testid="ends-after"
                    />
                    {t('endsAfter')}
                  </label>
                  {recurrenceEnd === 'AFTER_OCCURRENCES' && (
                    <>
                      <OccurrencesInput form={form} />
                      <span>{t('times')}</span>
                    </>
                  )}
                </div>
              </RadioGroup>
              <EndErrors form={form} />
            </FormItem>
          )}
        />
      )}
    </div>
  )
}

/** Errors of the end fields, shown under the radio group they belong to. */
function EndErrors({
  form,
}: {
  form: UseFormReturn<ExpenseFormInput, any, ExpenseFormValues>
}) {
  return (
    <>
      <FormField
        control={form.control}
        name="recurrenceEndDate"
        render={() => (
          <FormItem>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="recurrenceOccurrences"
        render={() => (
          <FormItem>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}

function EndDateInput({
  form,
}: {
  form: UseFormReturn<ExpenseFormInput, any, ExpenseFormValues>
}) {
  const value = useWatch({
    control: form.control,
    name: 'recurrenceEndDate',
  }) as Date | undefined
  return (
    <Input
      type="date"
      className="date-base w-auto"
      data-testid="recurrence-end-date"
      defaultValue={
        value instanceof Date && !Number.isNaN(value.getTime())
          ? toDateKey(value)
          : ''
      }
      onChange={(event) =>
        form.setValue(
          'recurrenceEndDate',
          event.target.value ? new Date(event.target.value) : undefined,
          { shouldDirty: true, shouldValidate: form.formState.isSubmitted },
        )
      }
    />
  )
}

function OccurrencesInput({
  form,
  className,
}: {
  form: UseFormReturn<ExpenseFormInput, any, ExpenseFormValues>
  className?: string
}) {
  const value = useWatch({
    control: form.control,
    name: 'recurrenceOccurrences',
  })
  return (
    <Input
      type="text"
      inputMode="numeric"
      className={cn('text-base w-20', className)}
      data-testid="recurrence-occurrences"
      value={value === undefined || value === null ? '' : String(value)}
      onChange={(event) => {
        const digits = event.target.value.replace(/\D/g, '').slice(0, 3)
        form.setValue(
          'recurrenceOccurrences',
          digits === '' ? undefined : Number(digits),
          { shouldDirty: true, shouldValidate: form.formState.isSubmitted },
        )
      }}
      onFocus={(event) => {
        const target = event.currentTarget
        setTimeout(() => target.select(), 1)
      }}
    />
  )
}

function InstallmentFields({
  form,
  isEdit,
}: {
  form: UseFormReturn<ExpenseFormInput, any, ExpenseFormValues>
  isEdit: boolean
}) {
  const t = useTranslations('ExpenseForm.Recurrence')
  const count = useWatch({
    control: form.control,
    name: 'recurrenceOccurrences',
  })

  return (
    <div className="grid sm:grid-cols-2 gap-6">
      <FormField
        control={form.control}
        name="recurrenceOccurrences"
        render={() => (
          <FormItem>
            <FormLabel>{t('installmentCount')}</FormLabel>
            <div className="flex items-center gap-2">
              <FormControl>
                <OccurrencesInput form={form} />
              </FormControl>
              <span className="text-sm text-muted-foreground">
                {t('installmentCountSuffix')}
              </span>
            </div>
            <div className="flex flex-wrap gap-1 pt-1">
              {INSTALLMENT_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  size="sm"
                  variant={Number(count) === preset ? 'secondary' : 'ghost'}
                  className="h-7 px-2 tabular-nums"
                  onClick={() =>
                    form.setValue('recurrenceOccurrences', preset, {
                      shouldDirty: true,
                      shouldValidate: form.formState.isSubmitted,
                    })
                  }
                >
                  {preset}x
                </Button>
              ))}
            </div>
            <FormDescription>
              {t('installmentCountDescription', {
                max: MAX_SERIES_OCCURRENCES,
              })}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="installmentAmountIsTotal"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('amountIs')}</FormLabel>
            <RadioGroup
              value={field.value === false ? 'each' : 'total'}
              onValueChange={(value) =>
                form.setValue('installmentAmountIsTotal', value === 'total', {
                  shouldDirty: true,
                })
              }
              className="gap-3"
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="total" data-testid="amount-is-total" />
                {t('amountIsTotal')}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="each" data-testid="amount-is-each" />
                {t('amountIsEach')}
              </label>
            </RadioGroup>
            {isEdit && field.value !== false && (
              <FormDescription>{t('editBecomesFirst')}</FormDescription>
            )}
          </FormItem>
        )}
      />
    </div>
  )
}

function InstallmentPlanControls({
  form,
  expense,
}: {
  form: UseFormReturn<ExpenseFormInput, any, ExpenseFormValues>
  expense: Expense
}) {
  const t = useTranslations('ExpenseForm.Recurrence')
  const recurrenceRule =
    useWatch({ control: form.control, name: 'recurrenceRule' }) ?? 'NONE'
  const count = expense.series?.occurrenceCount
  if (count != null && (expense.occurrenceNumber ?? 0) >= count)
    return (
      <p className="text-sm text-muted-foreground">{t('lastInstallment')}</p>
    )

  return (
    <label className="flex items-start gap-2 text-sm">
      <Checkbox
        data-testid="continue-installments"
        checked={recurrenceRule !== 'NONE'}
        onCheckedChange={(checked) =>
          form.setValue(
            'recurrenceRule',
            checked ? RecurrenceRule.MONTHLY : RecurrenceRule.NONE,
            { shouldDirty: true },
          )
        }
      />
      <span>
        {t('continueInstallments')}
        <span className="block text-muted-foreground">
          {t('continueInstallmentsDescription')}
        </span>
      </span>
    </label>
  )
}

function formatTimelineLabel(
  date: Date,
  rule: RecurrenceRuleName,
  locale: string,
) {
  if (rule === 'MONTHLY' || rule === 'YEARLY') {
    const month = date
      .toLocaleDateString(locale, { month: 'short', timeZone: 'UTC' })
      .replace('.', '')
    return `${month}/${String(date.getUTCFullYear()).slice(2)}`
  }
  return date.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  })
}

function formatDay(date: Date, locale: string) {
  return date.toLocaleDateString(locale, {
    dateStyle: 'medium',
    timeZone: 'UTC',
  })
}

function currentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

type TimelineItem = {
  key: string
  number: number
  date: Date
  amount: number
  state: 'recorded' | 'current' | 'expected'
  href?: string
}

function Timeline({
  items,
  rule,
  groupCurrency,
  locale,
  more,
}: {
  items: TimelineItem[]
  rule: RecurrenceRuleName
  groupCurrency: Currency
  locale: string
  more?: number
}) {
  const t = useTranslations('ExpenseForm.Recurrence')
  const thisMonth = currentMonthKey()
  return (
    <div className="-mx-1 overflow-x-auto pb-1" data-testid="series-timeline">
      <ol className="flex gap-1.5 px-1 w-max">
        {items.map((item) => {
          const content = (
            <>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {item.number}
                {toMonthKey(item.date) === thisMonth && ` · ${t('thisMonth')}`}
              </span>
              <span className="text-xs font-medium">
                {formatTimelineLabel(item.date, rule, locale)}
              </span>
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {formatCurrency(groupCurrency, item.amount, locale)}
              </span>
            </>
          )
          const className = cn(
            'flex flex-col items-center rounded-md border px-2 py-1 min-w-[4.5rem]',
            item.state === 'current' && 'border-primary bg-primary/10',
            item.state === 'expected' && 'border-dashed opacity-80',
            item.href && 'hover:bg-accent',
          )
          return (
            <li key={item.key}>
              {item.href ? (
                <Link href={item.href} className={className}>
                  {content}
                </Link>
              ) : (
                <div className={className}>{content}</div>
              )}
            </li>
          )
        })}
        {!!more && (
          <li className="flex items-center px-2 text-xs text-muted-foreground">
            {t('more', { count: more })}
          </li>
        )}
      </ol>
    </div>
  )
}

/** What creating the expense will start: amounts, dates, totals. */
function SchedulePreview({
  form,
  groupCurrency,
  firstOccurrenceNumber = 1,
  pastItems = [],
}: {
  form: UseFormReturn<ExpenseFormInput, any, ExpenseFormValues>
  groupCurrency: Currency
  /** When editing the latest occurrence of a series, its number… */
  firstOccurrenceNumber?: number
  /** …and the occurrences recorded before it. */
  pastItems?: TimelineItem[]
}) {
  const t = useTranslations('ExpenseForm.Recurrence')
  const locale = useLocale()

  const rule = (useWatch({ control: form.control, name: 'recurrenceRule' }) ??
    'NONE') as RecurrenceRuleName
  const kind = (useWatch({ control: form.control, name: 'seriesKind' }) ??
    'RECURRING') as SeriesKindName
  const end = (useWatch({ control: form.control, name: 'recurrenceEnd' }) ??
    'NEVER') as RecurrenceEndName
  const endDate = useWatch({
    control: form.control,
    name: 'recurrenceEndDate',
  }) as Date | undefined
  const occurrences =
    Number(
      useWatch({ control: form.control, name: 'recurrenceOccurrences' }),
    ) || undefined
  const isTotal =
    useWatch({ control: form.control, name: 'installmentAmountIsTotal' }) !==
    false
  const start = useWatch({ control: form.control, name: 'expenseDate' }) as Date
  const amount = amountAsMinorUnits(
    Number(useWatch({ control: form.control, name: 'amount' })) || 0,
    groupCurrency,
  )
  if (rule === 'NONE' || !(start instanceof Date) || isNaN(start.getTime()))
    return null

  const money = (value: number) => formatCurrency(groupCurrency, value, locale)

  if (kind === 'INSTALLMENTS' && firstOccurrenceNumber === 1) {
    if (!occurrences || occurrences < 2 || occurrences > MAX_SERIES_OCCURRENCES)
      return null
    const amounts = isTotal
      ? getInstallmentAmounts(amount, occurrences)
      : Array.from({ length: occurrences }, () => amount)
    const total = amounts.reduce((sum, value) => sum + value, 0)
    const dates = getSeriesDates(rule, start, {
      endDate: null,
      occurrenceCount: occurrences,
    })
    const thisMonth = currentMonthKey()
    const uneven = amounts[0] !== amounts[amounts.length - 1]
    return (
      <div
        className="rounded-lg border bg-muted/40 p-4 space-y-3"
        data-testid="installments-preview"
      >
        <div>
          <div className="text-lg font-semibold tabular-nums">
            {uneven
              ? t('installmentsUneven', {
                  count: occurrences,
                  first: money(amounts[0]),
                  other: money(amounts[amounts.length - 1]),
                })
              : t('installmentsEven', {
                  count: occurrences,
                  amount: money(amounts[0]),
                })}
          </div>
          <div className="text-sm text-muted-foreground">
            {t('purchaseTotal', { amount: money(total) })} ·{' '}
            {t('firstAndLast', {
              first: formatDay(dates[0], locale),
              last: formatDay(dates[dates.length - 1], locale),
            })}
          </div>
        </div>
        <Timeline
          rule={rule}
          groupCurrency={groupCurrency}
          locale={locale}
          items={dates.slice(0, TIMELINE_MAX).map((date, index) => ({
            key: toDateKey(date),
            number: index + 1,
            date,
            amount: amounts[index],
            state:
              toMonthKey(date) === thisMonth
                ? 'current'
                : toMonthKey(date) < thisMonth
                  ? 'recorded'
                  : 'expected',
          }))}
          more={Math.max(dates.length - TIMELINE_MAX, 0)}
        />
        <p className="text-xs text-muted-foreground">
          {t('installmentsHowItWorks')}
          {isTotal && <> {t('splitHint')}</>}
        </p>
      </div>
    )
  }

  if (kind === 'INSTALLMENTS') return null

  // A recurring expense: from this occurrence on.
  const bounds: SeriesBounds = {
    endDate: end === 'ON_DATE' && endDate instanceof Date ? endDate : null,
    occurrenceCount:
      end === 'AFTER_OCCURRENCES' && occurrences
        ? Math.max(occurrences - firstOccurrenceNumber + 1, 0)
        : null,
  }
  const isOpenEnded = bounds.endDate === null && bounds.occurrenceCount === null
  if (
    (end === 'ON_DATE' && !bounds.endDate) ||
    (end === 'AFTER_OCCURRENCES' && !occurrences)
  )
    return null
  const dates = getSeriesDates(
    rule,
    start,
    bounds,
    isOpenEnded ? OPEN_ENDED_PREVIEW : MAX_SERIES_OCCURRENCES,
  )
  if (dates.length === 0) return null
  const thisMonth = currentMonthKey()

  return (
    <div
      className="rounded-lg border bg-muted/40 p-4 space-y-3"
      data-testid="recurrence-preview"
    >
      <div className="text-sm">
        {isOpenEnded
          ? t('openEndedSummary', { amount: money(amount) })
          : t('boundedSummary', {
              count: dates.length + firstOccurrenceNumber - 1,
              last: formatDay(dates[dates.length - 1], locale),
              total: money(amount * dates.length),
            })}
      </div>
      <Timeline
        rule={rule}
        groupCurrency={groupCurrency}
        locale={locale}
        items={[
          ...pastItems.slice(-TIMELINE_MAX),
          ...dates.slice(0, TIMELINE_MAX).map(
            (date, index) =>
              ({
                key: toDateKey(date),
                number: index + firstOccurrenceNumber,
                date,
                amount,
                state:
                  index === 0
                    ? 'current'
                    : toMonthKey(date) < thisMonth
                      ? 'recorded'
                      : 'expected',
              }) satisfies TimelineItem,
          ),
        ]}
        more={
          isOpenEnded ? undefined : Math.max(dates.length - TIMELINE_MAX, 0)
        }
      />
      <p className="text-xs text-muted-foreground">
        {t('recurringHowItWorks')}
      </p>
    </div>
  )
}

/** The totals of an existing series, under its title. */
function SeriesSummary({
  expense,
  groupCurrency,
  locale,
}: {
  expense: Expense
  groupCurrency: Currency
  locale: string
}) {
  const t = useTranslations('ExpenseForm.Recurrence')
  const series = expense.series!
  const recorded = series.expenses.reduce((sum, e) => sum + e.amount, 0)
  const money = (value: number) => formatCurrency(groupCurrency, value, locale)

  if (series.kind === 'INSTALLMENTS' && series.occurrenceCount != null) {
    const total =
      series.totalAmount ??
      (series.expenses[0]?.amount ?? 0) * series.occurrenceCount
    const stopped =
      expense.recurrenceRule === 'NONE' &&
      !expense.recurringExpenseLink &&
      series.expenses.length < series.occurrenceCount
    return (
      <>
        {t('planSummary', {
          total: money(total),
          recorded: money(recorded),
          left: money(stopped ? 0 : Math.max(total - recorded, 0)),
        })}
        {stopped && <> · {t('stopped')}</>}
      </>
    )
  }
  return (
    <>
      {t('recurringSummary', {
        count: series.expenses.length,
        recorded: money(recorded),
      })}
    </>
  )
}

/** The recorded occurrences of the series of an expense, linked to. */
function getRecordedTimelineItems(
  expense: Expense,
  groupId: string,
): TimelineItem[] {
  return (expense.series?.expenses ?? []).map((occurrence, index) => ({
    key: occurrence.id,
    number: occurrence.occurrenceNumber ?? index + 1,
    date: new Date(occurrence.expenseDate),
    amount: occurrence.amount,
    state: occurrence.id === expense.id ? 'current' : 'recorded',
    href:
      occurrence.id === expense.id
        ? undefined
        : `/groups/${groupId}/expenses/${occurrence.id}/edit`,
  }))
}

/** The occurrences of an existing series, recorded and to come. */
function SeriesTimeline({
  expense,
  groupId,
  groupCurrency,
  locale,
}: {
  expense: Expense
  groupId: string
  groupCurrency: Currency
  locale: string
}) {
  const series = expense.series!
  const rule = (
    series.expenses.length > 0
      ? expense.recurrenceRule === 'NONE'
        ? 'MONTHLY'
        : expense.recurrenceRule
      : 'MONTHLY'
  ) as RecurrenceRuleName
  const recorded = getRecordedTimelineItems(expense, groupId)

  // Installments still to come, for a plan that is still running.
  const expected: TimelineItem[] = []
  const last = series.expenses.at(-1)
  const count = series.occurrenceCount
  const isRunning =
    series.kind === 'INSTALLMENTS' &&
    count != null &&
    last &&
    !(last.id === expense.id && expense.recurrenceRule === 'NONE')
  if (isRunning && series.expenses[0]) {
    const first = series.expenses[0]
    const dates = getSeriesDates('MONTHLY', new Date(first.expenseDate), {
      endDate: null,
      occurrenceCount: count,
    })
    const amounts =
      series.totalAmount != null
        ? getInstallmentAmounts(series.totalAmount, count)
        : dates.map(() => last.amount)
    for (
      let number = (last.occurrenceNumber ?? series.expenses.length) + 1;
      number <= count;
      number++
    ) {
      expected.push({
        key: `expected-${number}`,
        number,
        date: dates[number - 1],
        amount: amounts[number - 1],
        state: 'expected',
      })
    }
  }

  const items = [...recorded, ...expected]
  return (
    <Timeline
      items={items.slice(0, TIMELINE_MAX)}
      rule={series.kind === 'INSTALLMENTS' ? 'MONTHLY' : rule}
      groupCurrency={groupCurrency}
      locale={locale}
      more={Math.max(items.length - TIMELINE_MAX, 0)}
    />
  )
}
