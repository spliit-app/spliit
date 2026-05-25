import { env } from '@/lib/env'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import 'server-only'

export function createOpenAIClient() {
  return new OpenAI({ apiKey: env.OPENAI_API_KEY })
}

export function createAnthropicClient() {
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
}

/**
 * AI models per provider.
 *
 * OpenAI:
 *  - vision: gpt-5.4-mini  – multimodal, used for receipt image analysis
 *  - text:   gpt-5.4-nano  – cheapest/fastest, used for category text extraction
 *
 * Anthropic:
 *  - vision: claude-sonnet-4-5  – supports vision, balanced cost/performance
 *  - text:   claude-haiku-4-5   – fastest/cheapest Claude model, ideal for short text classification
 */
export const AI_MODELS = {
  openai: {
    vision: 'gpt-5.4-mini',
    text: 'gpt-5.4-nano',
  },
  anthropic: {
    vision: 'claude-sonnet-4-5',
    text: 'claude-haiku-4-5',
  },
} as const
