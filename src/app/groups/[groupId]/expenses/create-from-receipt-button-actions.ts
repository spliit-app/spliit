'use server'
import { getCategories } from '@/lib/api'
import { env } from '@/lib/env'
import { getRuntimeFeatureFlags } from '@/lib/featureFlags'
import { isAllowedUploadUrl } from '@/lib/uploaded-image-url'
import { formatCategoryForAIPrompt } from '@/lib/utils'
import OpenAI from 'openai'
import { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/index.mjs'

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

export async function extractExpenseInformationFromImage(imageUrl: string) {
  'use server'

  // Enforce the feature flag server-side: the UI gate only hides the button, it
  // does not prevent the action endpoint from being invoked directly.
  const { enableReceiptExtract } = await getRuntimeFeatureFlags()
  if (!enableReceiptExtract) {
    throw new Error('Receipt extraction is not enabled.')
  }

  // Only extract from images the app itself uploaded. Without this, an arbitrary
  // caller-supplied URL is forwarded to the model, enabling SSRF-via-OpenAI and
  // unbounded API spend.
  if (!isAllowedUploadUrl(imageUrl)) {
    throw new Error('Invalid image URL.')
  }

  const categories = await getCategories()

  const body: ChatCompletionCreateParamsNonStreaming = {
    model: 'gpt-5-nano',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `
              This image contains a receipt.
              Read the total amount and store it as a non-formatted number without any other text or currency.
              Then guess the category for this receipt among the following categories and store its ID: ${categories.map(
                (category) => formatCategoryForAIPrompt(category),
              )}.
              Guess the expense’s date and store it as yyyy-mm-dd.
              Guess a title for the expense.
              Return the amount, the category, the date and the title with just a comma between them, without anything else.`,
          },
        ],
      },
      {
        role: 'user',
        content: [{ type: 'image_url', image_url: { url: imageUrl } }],
      },
    ],
  }
  const completion = await openai.chat.completions.create(body)

  const [amountString, categoryId, date, title] = completion.choices
    .at(0)
    ?.message.content?.split(',') ?? [null, null, null, null]
  // The model is asked for a plain number, but nothing guarantees it obliges.
  // Report "not extracted" rather than passing NaN on to the expense form.
  const amount = Number(amountString)
  return {
    amount: Number.isFinite(amount) ? amount : null,
    categoryId,
    date,
    title,
  }
}

export type ReceiptExtractedInfo = Awaited<
  ReturnType<typeof extractExpenseInformationFromImage>
>
