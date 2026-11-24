import { TagBreakdown } from '@/app/groups/[groupId]/stats/tag-breakdown'
import { getCurrency } from '@/lib/currency'
import '@testing-library/jest-dom'
import { render, screen, within } from '@testing-library/react'

jest.mock('next-intl', () => ({
  useLocale: () => 'en-US',
  useTranslations: () => {
    const messages = require('../../../../../messages/en-US.json').Tags
    return (key: string, values: Record<string, string> = {}) =>
      messages[key].replace(
        /\{(\w+)\}/g,
        (_: string, name: string) => values[name],
      )
  },
}))
jest.mock('@/trpc/client', () => ({
  trpc: {
    groups: {
      stats: {
        tagExpenses: {
          useQuery: () => ({ data: { expenses: [] }, isLoading: false }),
        },
      },
    },
  },
}))
jest.mock('@/app/groups/[groupId]/stats/expenses-dialog', () => ({
  ExpensesDialog: () => null,
}))

it.each([
  { totals: [10000, -2500], widths: ['100%', '25%'] },
  { totals: [-2500, -5000], widths: ['50%', '100%'] },
  { totals: [0, 0], widths: ['0%', '0%'] },
])(
  'renders proportional magnitudes and signed amounts for $totals',
  ({ totals, widths }) => {
    render(
      <TagBreakdown
        groupId="group-1"
        currency={getCurrency('USD')}
        tags={totals.map((total, i) => ({
          tagId: `tag-${i}`,
          name: `Tag ${i}`,
          total,
        }))}
      />,
    )
    totals.forEach((total, i) => {
      const row = screen.getByRole('button', {
        name: `Show expenses for Tag ${i}`,
      })
      expect(
        row.querySelector<HTMLElement>('[style*="width"]')?.style.width,
      ).toBe(widths[i])
      expect(
        within(row).getByText(
          new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(total / 100),
        ),
      ).toBeInTheDocument()
    })
  },
)
