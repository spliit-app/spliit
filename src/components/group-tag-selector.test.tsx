import { GroupTagSelector } from '@/components/group-tag-selector'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const mockToast = jest.fn()
const mockInvalidate = jest.fn()
const mockDelete = jest.fn()

jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) =>
    require('../../messages/en-US.json').Tags[key],
}))
jest.mock('@/components/tag-selector', () => ({
  TagSelector: ({
    onDelete,
  }: {
    onDelete: (tag: { id: string; name: string }) => Promise<void>
  }) => (
    <button
      onClick={() => {
        void onDelete({ id: 'work', name: 'Work' }).catch(() => {})
      }}
    >
      Delete
    </button>
  ),
}))
jest.mock('@/trpc/client', () => ({
  trpc: {
    useUtils: () => ({
      groups: {
        tags: { invalidate: mockInvalidate },
        expenses: { invalidate: mockInvalidate },
        stats: { invalidate: mockInvalidate },
      },
    }),
    groups: {
      deleteTag: {
        useMutation: ({ onError }: { onError: () => void }) => ({
          mutateAsync: async (input: unknown) => {
            mockDelete(input)
            onError()
            throw new Error('Network failure')
          },
        }),
      },
    },
  },
}))

it('shows a translated destructive notification when deletion fails', async () => {
  render(
    <GroupTagSelector
      groupId="group-1"
      options={[{ id: 'work', name: 'Work' }]}
      value={['Work']}
      onValueChange={jest.fn()}
    />,
  )
  fireEvent.click(screen.getByText('Delete'))
  await waitFor(() =>
    expect(mockToast).toHaveBeenCalledWith({
      variant: 'destructive',
      description: 'Could not delete the tag. Please try again.',
    }),
  )
  expect(mockInvalidate).not.toHaveBeenCalled()
  expect(mockDelete).toHaveBeenCalledWith({ groupId: 'group-1', tagId: 'work' })
})
