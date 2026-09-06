jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('./env', () => ({
  env: {
    OPENAI_API_KEY: undefined as string | undefined,
    OPENAI_BASE_URL: undefined as string | undefined,
  },
}))

import OpenAI from 'openai'
import { env } from './env'
import { getOpenAIClient } from './openai'

const mockEnv = env as {
  OPENAI_API_KEY?: string
  OPENAI_BASE_URL?: string
}

describe('getOpenAIClient', () => {
  afterEach(() => {
    delete mockEnv.OPENAI_API_KEY
    delete mockEnv.OPENAI_BASE_URL
    jest.mocked(OpenAI).mockReset()
  })

  it('does not construct a client when the module is imported', () => {
    expect(OpenAI).not.toHaveBeenCalled()
  })

  it('throws before talking to the SDK when no API key is set', () => {
    expect(() => getOpenAIClient()).toThrow('OPENAI_API_KEY is not set.')
    expect(OpenAI).not.toHaveBeenCalled()
  })

  it('constructs the client on first use when a key is set', () => {
    mockEnv.OPENAI_API_KEY = 'sk-test'
    mockEnv.OPENAI_BASE_URL = 'https://llm.example/v1'

    getOpenAIClient()

    expect(OpenAI).toHaveBeenCalledTimes(1)
    expect(OpenAI).toHaveBeenCalledWith({
      apiKey: 'sk-test',
      baseURL: 'https://llm.example/v1',
    })
  })
})
