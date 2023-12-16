'use client'
import { AsyncButton } from '@/components/async-button'
import { SubmitButton } from '@/components/submit-button'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import { getExpense, getGroup } from '@/lib/api'
import { ExpenseFormValues, expenseFormSchema } from '@/lib/schemas'
import { cn } from '@/lib/utils'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { match } from 'ts-pattern'

export type Props = {
  group: NonNullable<Awaited<ReturnType<typeof getGroup>>>
  expense?: NonNullable<Awaited<ReturnType<typeof getExpense>>>
  onSubmit: (values: ExpenseFormValues) => Promise<void>
  onDelete?: () => Promise<void>
}

export function ExpenseForm({ group, expense, onSubmit, onDelete }: Props) {
  const isCreate = expense === undefined
  const searchParams = useSearchParams()
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: expense
      ? {
          title: expense.title,
          amount: String(expense.amount / 100) as unknown as number, // hack
          paidBy: expense.paidById,
          paidFor: expense.paidFor.map(({ participantId, shares }) => ({
            participant: participantId,
            shares,
          })),
          splitMode: expense.splitMode,
          isReimbursement: expense.isReimbursement,
        }
      : searchParams.get('reimbursement')
      ? {
          title: 'Reimbursement',
          amount: String(
            (Number(searchParams.get('amount')) || 0) / 100,
          ) as unknown as number, // hack
          paidBy: searchParams.get('from') ?? undefined,
          paidFor: [
            searchParams.get('to')
              ? { participant: searchParams.get('to')!, shares: 1 }
              : undefined,
          ],
          isReimbursement: true,
        }
      : { title: '', amount: 0, paidFor: [], isReimbursement: false },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => onSubmit(values))}>
        <Card>
          <CardHeader>
            <CardTitle>
              {isCreate ? <>Create expense</> : <>Edit expense</>}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="">
                  <FormLabel>Expense title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Monday evening restaurant"
                      className="text-base"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter a description for the expense.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem className="sm:order-3">
                  <FormLabel>Amount</FormLabel>
                  <div className="flex items-baseline gap-2">
                    <span>{group.currency}</span>
                    <FormControl>
                      <Input
                        className="text-base max-w-[120px]"
                        type="number"
                        inputMode="decimal"
                        step={0.01}
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />

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
                          <FormLabel>This is a reimbursement</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paidBy"
              render={({ field }) => (
                <FormItem className="sm:order-5">
                  <FormLabel>Paid by</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a participant" />
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
                    Select the participant who paid the expense.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="splitMode"
              render={({ field }) => (
                <FormItem className="sm:order-2">
                  <FormLabel>Split mode</FormLabel>
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
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EVENLY">Evenly</SelectItem>
                        <SelectItem value="BY_SHARES">
                          Unevenly – By shares
                        </SelectItem>
                        <SelectItem value="BY_PERCENTAGE">
                          Unevenly – By percentage
                        </SelectItem>
                        {/* <SelectItem value="BY_AMOUNT">
                                Unevenly – By amount
                              </SelectItem> */}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>
                    Select how to split the expense.
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paidFor"
              render={() => (
                <FormItem className="sm:order-4 row-span-2">
                  <div className="">
                    <FormLabel>
                      Paid for
                      <Button
                        variant="link"
                        type="button"
                        className="-m-2"
                        onClick={() => {
                          const paidFor = form.getValues().paidFor
                          const allSelected =
                            paidFor.length === group.participants.length
                          const newPaidFor = allSelected
                            ? []
                            : group.participants.map((p) => ({
                                participant: p.id,
                                shares: 1,
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
                          <>Select none</>
                        ) : (
                          <>Select all</>
                        )}
                      </Button>
                    </FormLabel>
                    <FormDescription>
                      Select who the expense was paid for.
                    </FormDescription>
                  </div>
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
                            className="flex items-center"
                          >
                            <FormItem className="flex-1 flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.some(
                                    ({ participant }) => participant === id,
                                  )}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([
                                          ...field.value,
                                          { participant: id, shares: 1 },
                                        ])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value.participant !== id,
                                          ),
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">
                                {name}
                              </FormLabel>
                            </FormItem>
                            {form.getValues().splitMode !== 'EVENLY' && (
                              <FormField
                                name={`paidFor[${field.value.findIndex(
                                  ({ participant }) => participant === id,
                                )}].shares`}
                                render={() => (
                                  <div>
                                    <div className="flex gap-1 items-baseline">
                                      <FormControl>
                                        <Input
                                          key={String(
                                            !field.value?.some(
                                              ({ participant }) =>
                                                participant === id,
                                            ),
                                          )}
                                          className="text-base w-[80px]"
                                          type="number"
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
                                          onChange={(event) =>
                                            field.onChange(
                                              field.value.map((p) =>
                                                p.participant === id
                                                  ? {
                                                      participant: id,
                                                      shares: Number(
                                                        event.target.value,
                                                      ),
                                                    }
                                                  : p,
                                              ),
                                            )
                                          }
                                          inputMode="numeric"
                                          step={1}
                                        />
                                      </FormControl>
                                      <span
                                        className={cn('text-sm', {
                                          'text-muted': !field.value?.some(
                                            ({ participant }) =>
                                              participant === id,
                                          ),
                                        })}
                                      >
                                        {match(form.getValues().splitMode)
                                          .with('EVENLY', () => <></>)
                                          .with('BY_SHARES', () => (
                                            <>share(s)</>
                                          ))
                                          .with('BY_PERCENTAGE', () => <>%</>)
                                          .with('BY_AMOUNT', () => (
                                            <>{group.currency}</>
                                          ))
                                          .exhaustive()}
                                      </span>
                                    </div>
                                    <FormMessage className="float-right" />
                                  </div>
                                )}
                              />
                            )}
                          </div>
                        )
                      }}
                    />
                  ))}
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <CardFooter className="gap-2">
            <SubmitButton
              loadingContent={isCreate ? <>Creating…</> : <>Saving…</>}
            >
              {isCreate ? <>Create</> : <>Save</>}
            </SubmitButton>
            {!isCreate && onDelete && (
              <AsyncButton
                type="button"
                variant="destructive"
                loadingContent="Deleting…"
                action={onDelete}
              >
                Delete
              </AsyncButton>
            )}
          </CardFooter>
        </Card>
      </form>
    </Form>
  )
}
