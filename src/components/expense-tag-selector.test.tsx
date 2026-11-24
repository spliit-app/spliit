import { ExpenseTagSelector } from '@/components/group-tag-selector'
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form'
import { ExpenseTag, expenseTagsSchema } from '@/lib/tags'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

let mockIsDesktop = true
jest.mock('@/lib/hooks', () => ({ useMediaQuery: () => mockIsDesktop }))
beforeEach(() => {
  mockIsDesktop = true
})
jest.mock('next-intl', () => ({
  useTranslations: () => {
    const messages = require('../../messages/en-US.json').Tags
    return (key: string, values: Record<string, string | number> = {}) =>
      messages[key].replace(/\{(\w+)\}/g, (_: string, name: string) =>
        String(values[name]),
      )
  },
}))

beforeAll(() => {
  window.matchMedia = jest.fn().mockImplementation((media: string) => ({
    matches: false,
    media,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }))
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView = jest.fn()
})

jest.mock('@/trpc/client', () => ({
  trpc: {
    useUtils: () => ({
      groups: {
        tags: { invalidate: jest.fn() },
        expenses: { invalidate: jest.fn() },
        stats: { invalidate: jest.fn() },
      },
    }),
    groups: { deleteTag: { useMutation: () => ({ mutateAsync: jest.fn() }) } },
  },
}))
const schema = z.object({ tags: expenseTagsSchema })
function Harness({
  save,
  options = [],
}: {
  save: (value: unknown) => void
  options?: ExpenseTag[]
}) {
  const form = useForm<
    z.input<typeof schema>,
    unknown,
    z.output<typeof schema>
  >({ resolver: zodResolver(schema), defaultValues: { tags: [] } })
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(save)}>
        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <ExpenseTagSelector
                  {...field}
                  groupId="test"
                  value={field.value}
                  options={options}
                  onValueChange={field.onChange}
                  allowCreate
                />
              </FormControl>
            </FormItem>
          )}
        />
        <button type="submit">Save</button>
        <output data-testid="values">{JSON.stringify(form.watch())}</output>
        <output data-testid="errors">
          {JSON.stringify(form.formState.errors, (key, value) =>
            key === 'ref' ? undefined : value,
          )}
        </output>
      </form>
    </Form>
  )
}
it('saves an expense form after adding a new tag', async () => {
  const save = jest.fn()
  render(<Harness save={save} />)
  fireEvent.click(screen.getByRole('button', { name: 'Select or add tag' }))
  fireEvent.change(screen.getByPlaceholderText('Search tags'), {
    target: { value: 'taiwan trip' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Create “taiwan trip”' }))
  fireEvent.keyDown(document, { key: 'Escape' })
  fireEvent.click(screen.getByText('Save'))
  await waitFor(() => expect(save).toHaveBeenCalled())
  expect(save.mock.calls[0][0]).toEqual({ tags: [{ name: 'taiwan trip' }] })
})

it('saves an existing tag by ID through the form controller', async () => {
  const save = jest.fn()
  render(
    <Harness save={save} options={[{ id: 'trip', name: 'taiwan trip' }]} />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Select or add tag' }))
  fireEvent.click(screen.getByRole('checkbox', { name: 'taiwan trip' }))
  fireEvent.keyDown(document, { key: 'Escape' })
  fireEvent.click(screen.getByText('Save'))
  await waitFor(() => expect(save).toHaveBeenCalled())
  expect(save.mock.calls[0][0]).toEqual({
    tags: [{ id: 'trip', name: 'taiwan trip' }],
  })
})
