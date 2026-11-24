import { TagFilterButton } from '@/components/tag-filter-button'
import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) =>
    require('../../messages/en-US.json').Tags[key],
}))

beforeAll(() => {
  Object.defineProperty(window, 'PointerEvent', {
    value: MouseEvent,
    writable: true,
  })
  Element.prototype.hasPointerCapture = jest.fn(() => false)
  Element.prototype.setPointerCapture = jest.fn()
  Element.prototype.releasePointerCapture = jest.fn()
  Element.prototype.scrollIntoView = jest.fn()
})

function Filter() {
  const [value, setValue] = useState<string[]>([])
  const [untagged, setUntagged] = useState(false)
  return (
    <TagFilterButton
      tags={[
        { id: 'food', name: 'Food' },
        { id: 'transport', name: 'Transport' },
      ]}
      value={value}
      untagged={untagged}
      onValueChange={(ids, onlyUntagged) => {
        setValue(ids)
        setUntagged(onlyUntagged)
      }}
    />
  )
}

it('selects multiple tags without closing the menu', () => {
  render(<Filter />)
  fireEvent.pointerDown(
    screen.getByRole('button', { name: 'Filter by tags' }),
    { button: 0, ctrlKey: false },
  )
  fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Food' }))
  fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Transport' }))
  expect(
    screen.getByRole('menuitemcheckbox', { name: 'Food' }),
  ).toHaveAttribute('aria-checked', 'true')
  expect(
    screen.getByRole('menuitemcheckbox', { name: 'Transport' }),
  ).toHaveAttribute('aria-checked', 'true')
  expect(screen.getByRole('menu')).toBeInTheDocument()
})

it('combines untagged and named tags and supports clearing', () => {
  render(<Filter />)
  fireEvent.pointerDown(
    screen.getByRole('button', { name: 'Filter by tags' }),
    { button: 0, ctrlKey: false },
  )
  fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Food' }))
  fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Untagged' }))
  expect(
    screen.getByRole('menuitemcheckbox', { name: 'Food' }),
  ).toHaveAttribute('aria-checked', 'true')
  expect(
    screen.getByRole('menuitemcheckbox', { name: 'Untagged' }),
  ).toHaveAttribute('aria-checked', 'true')
  fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Transport' }))
  expect(
    screen.getByRole('menuitemcheckbox', { name: 'Untagged' }),
  ).toHaveAttribute('aria-checked', 'true')
  fireEvent.click(screen.getByRole('menuitem', { name: 'Clear filters' }))
  fireEvent.pointerDown(
    screen.getByRole('button', { name: 'Filter by tags' }),
    { button: 0, ctrlKey: false },
  )
  expect(
    screen.getByRole('menuitemcheckbox', { name: 'Transport' }),
  ).toHaveAttribute('aria-checked', 'false')
  expect(
    screen.queryByRole('menuitem', { name: 'Clear filters' }),
  ).not.toBeInTheDocument()
})
