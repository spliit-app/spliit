'use client'

import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getPaymentMethodDefinition,
  MAX_PAYMENT_METHODS,
  PAYMENT_METHODS,
  type PaymentMethod,
  type PaymentMethodType,
} from '@/lib/payment-methods'
import { ChevronDown, Pencil, Trash2, Wallet } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useId, useState } from 'react'

/** Every field name used by a method in the registry (see messages). */
type FieldKey = 'name' | 'iban' | 'bic' | 'phone' | 'username'

const ERROR_KEYS = [
  'invalidIban',
  'invalidBic',
  'invalidPhone',
  'invalidUsername',
  'min1',
  'max70',
] as const

function errorKey(code: string): (typeof ERROR_KEYS)[number] | 'invalid' {
  return (ERROR_KEYS as readonly string[]).includes(code)
    ? (code as (typeof ERROR_KEYS)[number])
    : 'invalid'
}

type Props = {
  value: PaymentMethod[] | undefined
  onChange: (value: PaymentMethod[]) => void
  participantName: string
}

/** Per-participant list of ways to be paid back, shown in the group form. */
export function PaymentMethodsEditor({
  value = [],
  onChange,
  participantName,
}: Props) {
  const t = useTranslations('PaymentMethods')
  const [open, setOpen] = useState(false)
  // Index being edited, 'new' while adding, or null.
  const [editing, setEditing] = useState<number | 'new' | null>(null)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-2">
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-muted-foreground"
        >
          <Wallet className="w-3.5 h-3.5 mr-1.5" />
          {value.length > 0
            ? t('editorToggleCount', { count: value.length })
            : t('editorToggle')}
          <ChevronDown
            className={`w-3.5 h-3.5 ml-1 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-2 pt-2">
        <p className="text-xs text-muted-foreground">{t('editorPrivacy')}</p>
        {value.map((method, index) =>
          editing === index ? (
            <MethodForm
              key={index}
              initial={method}
              participantName={participantName}
              onCancel={() => setEditing(null)}
              onSave={(saved) => {
                onChange(value.map((m, i) => (i === index ? saved : m)))
                setEditing(null)
              }}
            />
          ) : (
            <div
              key={index}
              className="flex items-center gap-2 text-sm rounded-md border px-2 py-1"
            >
              <span className="font-medium">{t(`${method.type}.label`)}</span>
              <span className="flex-1 truncate text-muted-foreground">
                {getPaymentMethodDefinition(method.type)?.summary(method)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label={t('edit', { method: t(`${method.type}.label`) })}
                onClick={() => setEditing(index)}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                aria-label={t('remove', { method: t(`${method.type}.label`) })}
                onClick={() => onChange(value.filter((_, i) => i !== index))}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ),
        )}
        {editing === 'new' ? (
          <MethodForm
            participantName={participantName}
            onCancel={() => setEditing(null)}
            onSave={(saved) => {
              onChange([...value, saved])
              setEditing(null)
            }}
          />
        ) : (
          value.length < MAX_PAYMENT_METHODS &&
          editing === null && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => setEditing('new')}
            >
              {t('add')}
            </Button>
          )
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

function MethodForm({
  initial,
  participantName,
  onSave,
  onCancel,
}: {
  initial?: PaymentMethod
  participantName: string
  onSave: (method: PaymentMethod) => void
  onCancel: () => void
}) {
  const t = useTranslations('PaymentMethods')
  const idPrefix = useId()
  const [type, setType] = useState<PaymentMethodType>(initial?.type ?? 'sepa')
  const [values, setValues] = useState<Record<string, string>>(() =>
    initial
      ? Object.fromEntries(
          Object.entries(initial).filter(([key]) => key !== 'type'),
        )
      : type === 'sepa'
        ? { name: participantName }
        : {},
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const definition = getPaymentMethodDefinition(type)
  if (!definition) return null

  function save() {
    if (!definition) return
    const input: Record<string, string> = { type }
    for (const field of definition.fields) {
      const raw = (values[field.name] ?? '').trim()
      if (raw !== '' || !field.optional) input[field.name] = raw
    }
    const parsed = definition.schema.safeParse(input)
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [
            String(issue.path[0]),
            issue.message,
          ]),
        ),
      )
      return
    }
    onSave(parsed.data as PaymentMethod)
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${idPrefix}-type`}>{t('method')}</Label>
        <Select
          value={type}
          onValueChange={(next) => {
            setType(next as PaymentMethodType)
            setErrors({})
          }}
          disabled={Boolean(initial)}
        >
          <SelectTrigger id={`${idPrefix}-type`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_METHODS.map((method) => (
              <SelectItem key={method.type} value={method.type}>
                {t(`${method.type}.label`)} · {t(`${method.type}.where`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {definition.fields.map((field) => {
        const id = `${idPrefix}-${field.name}`
        return (
          <div key={field.name} className="flex flex-col gap-1">
            <Label htmlFor={id}>
              {t(`fields.${field.name as FieldKey}`)}
              {field.optional && (
                <span className="text-muted-foreground font-normal">
                  {' '}
                  ({t('optional')})
                </span>
              )}
            </Label>
            <Input
              id={id}
              className="text-base"
              inputMode={field.inputMode === 'tel' ? 'tel' : 'text'}
              autoComplete="off"
              placeholder={field.placeholder}
              value={values[field.name] ?? ''}
              aria-invalid={Boolean(errors[field.name])}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  [field.name]: event.target.value,
                }))
              }
            />
            {errors[field.name] && (
              <p className="text-sm text-destructive" role="alert">
                {t(`errors.${errorKey(errors[field.name])}`)}
              </p>
            )}
          </div>
        )
      })}
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={save}>
          {t('save')}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          {t('cancel')}
        </Button>
      </div>
    </div>
  )
}
