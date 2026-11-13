import {
  buildExpensesFromFileImport,
  type ImportBuildResult,
} from '@/lib/imports/file-import'
import { act, renderHook } from '@testing-library/react'
import { useFileImportProcess } from './use-import-process'

jest.mock('@/app/groups/recent-groups-helpers', () => ({
  saveRecentGroup: jest.fn(),
}))
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}))
jest.mock('@/lib/imports/file-import', () => ({
  buildExpensesFromFileImport: jest.fn(),
}))
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
jest.mock('@/trpc/client', () => ({
  trpc: {
    groups: {
      create: { useMutation: () => ({}) },
      importProcessBatch: { useMutation: () => ({}) },
    },
  },
}))

const build = jest.mocked(buildExpensesFromFileImport)
const preview: ImportBuildResult = {
  expenses: [],
  errors: [],
  participantSummaries: [],
  participants: [],
  format: { id: 'json', label: 'JSON' },
  group: { name: 'Current group', participants: [] },
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

// Leave reads pending until the test chooses their completion order.
class ControlledReader {
  static readers: ControlledReader[] = []
  result = ''
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  readAsText() {
    ControlledReader.readers.push(this)
  }
  complete(content: string) {
    this.result = content
    this.onload?.()
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  ControlledReader.readers = []
  jest
    .spyOn(globalThis, 'FileReader')
    .mockImplementation(() => new ControlledReader() as unknown as FileReader)
  build.mockResolvedValue(preview)
})
afterEach(() => jest.restoreAllMocks())

it.each(['old content', '', 'read error'])(
  'ignores an older read completing after the current preview (%j)',
  async (content) => {
    const { result } = renderHook(() => useFileImportProcess())
    let old!: Promise<void>
    let current!: Promise<void>
    act(() => {
      old = result.current.analyzeFile(new File(['old'], 'old.json'))
    })
    act(() => {
      current = result.current.analyzeFile(new File(['new'], 'new.json'))
    })
    await act(async () => {
      ControlledReader.readers[1].complete('new content')
      await current
    })
    await act(async () => {
      if (content === 'read error') ControlledReader.readers[0].onerror?.()
      else ControlledReader.readers[0].complete(content)
      await old
    })
    expect(build).toHaveBeenCalledTimes(1)
    expect(result.current).toMatchObject({
      processState: 'preview',
      fileName: 'new.json',
      fileContent: 'new content',
      previewResult: preview,
      groupName: 'Current group',
      previewError: null,
    })
  },
)

it.each(['resolve', 'reject'] as const)(
  'ignores an obsolete parser that later %ss',
  async (outcome) => {
    const pending = deferred<ImportBuildResult>()
    build.mockReturnValueOnce(pending.promise)
    const { result } = renderHook(() => useFileImportProcess())
    let old!: Promise<void>
    act(() => {
      old = result.current.analyzeFile(new File(['old'], 'old.json'))
    })
    await act(async () => {
      ControlledReader.readers[0].complete('old content')
    })
    let current!: Promise<void>
    act(() => {
      current = result.current.analyzeFile(new File(['new'], 'new.json'))
    })
    await act(async () => {
      ControlledReader.readers[1].complete('new content')
      await current
    })
    await act(async () => {
      if (outcome === 'resolve')
        pending.resolve({
          ...preview,
          group: { name: 'Old group', participants: [] },
        })
      else pending.reject(new Error('Old failure'))
      await old
    })
    expect(result.current).toMatchObject({
      processState: 'preview',
      fileName: 'new.json',
      fileContent: 'new content',
      previewResult: preview,
      groupName: 'Current group',
      previewError: null,
    })
  },
)

it.each(['read', 'parse'] as const)(
  'keeps reset state when a pending %s completes',
  async (phase) => {
    const pending = deferred<ImportBuildResult>()
    build.mockReturnValueOnce(pending.promise)
    const { result } = renderHook(() => useFileImportProcess())
    let analysis!: Promise<void>
    act(() => {
      analysis = result.current.analyzeFile(new File(['old'], 'old.json'))
    })
    if (phase === 'parse')
      await act(async () => {
        ControlledReader.readers[0].complete('old content')
      })
    act(() => result.current.resetProcess())
    await act(async () => {
      if (phase === 'read') ControlledReader.readers[0].complete('old content')
      pending.resolve(preview)
      await analysis
    })
    expect(result.current).toMatchObject({
      processState: 'idle',
      fileName: null,
      fileContent: '',
      previewResult: null,
      groupName: '',
      previewError: null,
    })
    if (phase === 'read') expect(build).not.toHaveBeenCalled()
  },
)
