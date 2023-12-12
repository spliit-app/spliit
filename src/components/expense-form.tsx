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
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'

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
          paidFor: expense.paidFor.map(({ participantId }) => participantId),
          isReimbursement: expense.isReimbursement,
        }
      : searchParams.get('reimbursement')
      ? {
          title: 'Reimbursement',
          amount: String(
            (Number(searchParams.get('amount')) || 0) / 100,
          ) as unknown as number, // hack
          paidBy: searchParams.get('from') ?? undefined,
          paidFor: [searchParams.get('to') ?? undefined],
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
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="order-1">
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
              name="paidBy"
              render={({ field }) => (
                <FormItem className="order-3 sm:order-2">
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
              name="amount"
              render={({ field }) => (
                <FormItem className="order-2 sm:order-3">
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
              name="paidFor"
              render={() => (
                <FormItem className="order-5">
                  <div className="mb-4">
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
                          const newPairFor = allSelected
                            ? []
                            : group.participants.map((p) => p.id)
                          form.setValue('paidFor', newPairFor, {
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
                          <FormItem
                            key={id}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, id])
                                    : field.onChange(
                                        field.value?.filter(
                                          (value) => value !== id,
                                        ),
                                      )
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              {name}
                            </FormLabel>
                          </FormItem>
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
