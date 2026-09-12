import {
  Form,
  FormControl,
  FormField,
  FormFieldScope,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { zodResolver } from '@hookform/resolvers/zod'
import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

// next-intl is ESM-only, which Jest does not transform inside node_modules.
// FormMessage only looks a message up and formats it, so stand that one hook
// up with the real translations and just enough ICU syntax for the schema
// errors: `{name}` and `{name, select, a {..} other {..}}`.
jest.mock('next-intl', () => ({
  useTranslations: (namespace: string) => {
    const messages = require('../../../messages/en-US.json')[namespace]
    const t = (key: string, values: Record<string, string | number> = {}) =>
      (messages[key] as string)
        .replace(
          /\{(\w+), select,((?:\s*\w+ \{[^}]*\})+)\s*\}/g,
          (_, name, options: string) => {
            const choices = Object.fromEntries(
              Array.from(
                options.matchAll(/(\w+) \{([^}]*)\}/g),
                ([, choice, text]) => [choice, text],
              ),
            )
            return choices[String(values[name])] ?? choices.other
          },
        )
        .replace(/\{(\w+)\}/g, (_, name) => String(values[name]))
    t.has = (key: string) => key in messages
    return t
  },
}))

// Mirrors the expense form: a `paidFor` array with one row per checked
// participant, whose per-row inputs are driven by the array field and only
// scoped (not registered) under their own path, plus a refinement that reports
// on the array itself.
const schema = z
  .object({
    title: z.string(),
    paidFor: z.array(z.object({ participant: z.string(), shares: z.string() })),
  })
  .superRefine((values, ctx) => {
    const sum = values.paidFor.reduce(
      (total, { shares }) => total + Number(shares),
      0,
    )
    if (sum !== 100) {
      ctx.addIssue({
        code: 'custom',
        message: 'percentageSum',
        path: ['paidFor'],
      })
    }
  })

// Carol is not paid for, so her row has no index in the array (-1), and no
// row has an `originalAmount` -- the two shapes that used to leak into the
// form values when the rows were registered as fields of their own.
const PARTICIPANTS = ['alice', 'bob', 'carol']

function TestForm() {
  const form = useForm<z.input<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: 'Dinner',
      paidFor: [
        { participant: 'alice', shares: '50' },
        { participant: 'bob', shares: '30' },
      ],
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(() => {})}>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <input aria-label="Title" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="paidFor"
          render={({ field }) => (
            <FormItem>
              {PARTICIPANTS.map((participant) => {
                const index = field.value.findIndex(
                  (row) => row.participant === participant,
                )
                return (
                  <FormFieldScope
                    key={participant}
                    name={`paidFor.${index}.originalAmount`}
                  >
                    <FormFieldScope name={`paidFor.${index}.shares`}>
                      <FormControl>
                        <input
                          aria-label={participant}
                          disabled={index === -1}
                          value={field.value[index]?.shares ?? ''}
                          onChange={(event) =>
                            field.onChange(
                              field.value.map((row) =>
                                row.participant === participant
                                  ? { ...row, shares: event.target.value }
                                  : row,
                              ),
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormFieldScope>
                  </FormFieldScope>
                )
              })}
              <FormMessage
                values={{ sum: 80, difference: 20, direction: 'under' }}
              />
            </FormItem>
          )}
        />
        <output data-testid="dirty-fields">
          {JSON.stringify(form.formState.dirtyFields)}
        </output>
        <button type="submit">Submit</button>
      </form>
    </Form>
  )
}

it('renders an error reported on a field array as a whole', async () => {
  render(<TestForm />)

  fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

  expect(
    await screen.findByText(
      'The percentages add up to 80%, 20% less than 100%.',
    ),
  ).toBeVisible()
  expect(screen.queryByText('undefined')).not.toBeInTheDocument()
})

it('keeps the array field pristine when its rows are only scoped', async () => {
  render(<TestForm />)

  const dirtyFields = screen.getByTestId('dirty-fields')
  expect(dirtyFields).toHaveTextContent('{}')

  // A change back to a default value is what makes react-hook-form recompute
  // every field's dirtiness from the current values. Had the rows been
  // registered through FormField, `paidFor.-1.shares` and
  // `paidFor.0.originalAmount` would by now sit in those values, and `paidFor`
  // would come out dirty although nobody touched it.
  const title = screen.getByLabelText('Title')
  fireEvent.change(title, { target: { value: 'Dinner!' } })
  expect(dirtyFields).toHaveTextContent('{"title":true}')
  fireEvent.change(title, { target: { value: 'Dinner' } })
  expect(dirtyFields).toHaveTextContent('{}')
})
