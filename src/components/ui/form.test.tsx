import { Form, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { zodResolver } from '@hookform/resolvers/zod'
import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import messages from '../../../messages/en-US.json'

// next-intl is ESM-only, which Jest does not transform inside node_modules.
// FormMessage only reads the message catalogue, so stand that one hook up with
// the real translations.
jest.mock('next-intl', () => ({
  useMessages: () => require('../../../messages/en-US.json'),
}))

// Mirrors the expense form: a `paidFor` array whose per-row inputs register
// bracket-indexed names, plus a refinement that reports on the array itself.
const schema = z
  .object({
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

function TestForm() {
  const form = useForm<z.input<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
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
          name="paidFor"
          render={({ field }) => (
            <FormItem>
              {field.value.map((_, index) => (
                <FormField
                  key={index}
                  name={`paidFor[${index}].shares`}
                  render={() => (
                    <FormItem>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
              <FormMessage />
            </FormItem>
          )}
        />
        <button type="submit">Submit</button>
      </form>
    </Form>
  )
}

it('renders an error reported on a field array as a whole', async () => {
  render(<TestForm />)

  fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

  expect(
    await screen.findByText(messages.SchemaErrors.percentageSum),
  ).toBeVisible()
  expect(screen.queryByText('undefined')).not.toBeInTheDocument()
})
