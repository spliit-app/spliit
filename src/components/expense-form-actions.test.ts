// `var` and the indirection through an arrow are both deliberate: the module
// under test constructs its OpenAI client at import time, which jest hoists
// above this file's own initialisation.
var mockCreate = jest.fn()

jest.mock('openai', () => ({
  __esModule: true,
  default: class {
    chat = {
      completions: { create: (...args: unknown[]) => mockCreate(...args) },
    }
  },
}))
jest.mock('../lib/env', () => ({
  env: {
    OPENAI_API_KEY: 'sk-test',
    OPENAI_BASE_URL: undefined,
    OPENAI_MODEL_CATEGORY_EXTRACT: 'test-model',
  },
}))
jest.mock('../lib/featureFlags', () => ({
  getRuntimeFeatureFlags: async () => ({ enableCategoryExtract: true }),
}))
jest.mock('../lib/api', () => ({
  getCategories: async () => [
    { id: 0, grouping: 'General', name: 'General' },
    { id: 4, grouping: 'Transport', name: 'Taxi' },
  ],
}))

import { extractCategoryFromTitle } from './expense-form-actions'

function respondWith(content: string | null) {
  mockCreate.mockResolvedValue({ choices: [{ message: { content } }] })
}

describe('extractCategoryFromTitle', () => {
  beforeEach(() => mockCreate.mockReset())

  it('returns the category the model picked', async () => {
    respondWith(JSON.stringify({ categoryId: 4 }))
    expect(await extractCategoryFromTitle('Taxi to the airport')).toEqual({
      categoryId: 4,
    })
  })

  it('asks for a strict JSON schema, and for the configured model', async () => {
    respondWith(JSON.stringify({ categoryId: 4 }))
    await extractCategoryFromTitle('Taxi to the airport')

    const request = mockCreate.mock.calls[0][0]
    expect(request.model).toBe('test-model')
    expect(request.response_format.type).toBe('json_schema')
    expect(request.response_format.json_schema.strict).toBe(true)
    // Both were tuned for a free-text answer and are rejected by the models
    // that support structured outputs.
    expect(request.max_tokens).toBeUndefined()
    expect(request.temperature).toBeUndefined()
  })

  it('truncates the title before sending it', async () => {
    respondWith(JSON.stringify({ categoryId: 4 }))
    await extractCategoryFromTitle('T'.repeat(100))

    const userMessage = mockCreate.mock.calls[0][0].messages.at(-1)
    expect(userMessage.content).toHaveLength(40)
  })

  // Everything below must degrade to the "General" fallback rather than throw:
  // a self-hosted endpoint may ignore the schema entirely.
  it.each([
    ['an id that does not exist', JSON.stringify({ categoryId: 9999 })],
    ['a value of the wrong type', JSON.stringify({ categoryId: 'four' })],
    ['a missing field', JSON.stringify({})],
    ['a response that is not JSON', 'Transport'],
    ['an empty response', ''],
  ])('falls back to the first category for %s', async (_name, content) => {
    respondWith(content)
    expect(await extractCategoryFromTitle('Taxi to the airport')).toEqual({
      categoryId: 0,
    })
  })

  it('falls back to the first category when there is no content at all', async () => {
    respondWith(null)
    expect(await extractCategoryFromTitle('Taxi to the airport')).toEqual({
      categoryId: 0,
    })
  })
})
