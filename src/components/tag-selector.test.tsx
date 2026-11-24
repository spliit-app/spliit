import { TagSelector } from '@/components/tag-selector'
import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'

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

function Selector({
  allowCreate = true,
  maxTags = 10,
  onDelete,
}: {
  allowCreate?: boolean
  onDelete?: (name: string) => Promise<void>
  maxTags?: number
}) {
  const [value, setValue] = useState<string[]>([])
  return (
    <TagSelector
      options={['Summer trip', 'Work']}
      value={value}
      onValueChange={setValue}
      allowCreate={allowCreate}
      onDelete={onDelete}
      maxTags={maxTags}
    />
  )
}

describe('TagSelector', () => {
  it('selects several existing tags and removes a selection', () => {
    render(<Selector />)
    fireEvent.click(screen.getByRole('button', { name: 'Select or add tag' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Summer trip' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Work' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove Summer trip' }))
    expect(
      screen.queryByRole('button', { name: 'Remove Summer trip' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Remove Work' }),
    ).toBeInTheDocument()
  })

  it('creates only after an explicit selection and reuses case-equivalent names', () => {
    render(<Selector />)
    fireEvent.click(screen.getByRole('button', { name: 'Select or add tag' }))
    const search = screen.getByPlaceholderText('Search tags')
    fireEvent.change(search, { target: { value: 'New event' } })
    expect(
      screen.queryByRole('button', { name: 'Remove New event' }),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Create “New event”' }))
    expect(
      screen.getByRole('button', { name: 'Remove New event' }),
    ).toBeInTheDocument()
    fireEvent.change(search, { target: { value: 'summer TRIP' } })
    expect(
      screen.queryByRole('button', { name: /Create/ }),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Summer trip' }))
    expect(
      screen.getByRole('button', { name: 'Remove Summer trip' }),
    ).toBeInTheDocument()
  })

  it('disables additional choices at the selection limit', () => {
    render(<Selector maxTags={1} />)
    fireEvent.click(screen.getByRole('button', { name: 'Select or add tag' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Work' }))
    expect(screen.getByRole('checkbox', { name: 'Summer trip' })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('up to 1 tags')
    fireEvent.click(screen.getByRole('button', { name: 'Remove Work' }))
    expect(
      screen.getByRole('checkbox', { name: 'Summer trip' }),
    ).not.toBeDisabled()
  })

  it('does not offer creation in the expense filter', () => {
    render(<Selector allowCreate={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Select tags' }))
    fireEvent.change(screen.getByPlaceholderText('Search tags'), {
      target: { value: 'Missing' },
    })
    expect(
      screen.queryByRole('button', { name: /Create/ }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('No matching tags.')).toBeInTheDocument()
  })
})

it('uses checked state in the mobile drawer', () => {
  mockIsDesktop = false
  render(<Selector />)
  fireEvent.click(screen.getByRole('button', { name: 'Select or add tag' }))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  const checkbox = screen.getByRole('checkbox', { name: 'Work' })
  expect(checkbox).not.toBeChecked()
  fireEvent.click(checkbox)
  expect(checkbox).toBeChecked()
  checkbox.focus()
  expect(checkbox).toHaveFocus()
})

it.each([true, false])(
  'confirms deletion before calling the server (desktop=%s)',
  async (desktop) => {
    mockIsDesktop = desktop
    const onDelete = jest.fn().mockResolvedValue(undefined)
    render(<Selector onDelete={onDelete} />)
    fireEvent.click(screen.getByRole('button', { name: 'Select or add tag' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Work' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete tag Work' }))
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'remove it from every expense',
    )
    expect(onDelete).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onDelete).not.toHaveBeenCalled()
    expect(
      screen.getByRole('button', { name: 'Remove Work' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Select or add tag' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete tag Work' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete tag' }))
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('Work'))
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Remove Work' }),
      ).not.toBeInTheDocument(),
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  },
)

it('does not offer group deletion for an unsaved tag', () => {
  render(<Selector onDelete={jest.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Select or add tag' }))
  fireEvent.change(screen.getByPlaceholderText('Search tags'), {
    target: { value: 'Unsaved' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Create “Unsaved”' }))
  expect(
    screen.queryByRole('button', { name: 'Delete tag Unsaved' }),
  ).not.toBeInTheDocument()
})

it('keeps the confirmation and selection when deletion fails', async () => {
  const error = jest.spyOn(console, 'error').mockImplementation(() => {})
  try {
    render(
      <Selector
        onDelete={jest.fn().mockRejectedValue(new Error('Network error'))}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Select or add tag' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Work' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete tag Work' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete tag' }))
    await waitFor(() => expect(error).toHaveBeenCalled())
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Remove Work' }),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Delete tag' }),
      ).not.toBeDisabled(),
    )
  } finally {
    error.mockRestore()
  }
})
