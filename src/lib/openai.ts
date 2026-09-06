import OpenAI from 'openai'

import { env } from './env'

/**
 * Build an OpenAI client when needed.
 */
export function getOpenAIClient() {
  const apiKey = env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set.')
  }
  return new OpenAI({
    apiKey,
    baseURL: env.OPENAI_BASE_URL,
  })
}
