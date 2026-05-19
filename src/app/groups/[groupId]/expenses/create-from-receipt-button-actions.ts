'use server'
import { getCategories } from '@/lib/api'
import { env } from '@/lib/env'
import { AI_MODELS, createAnthropicClient, createOpenAIClient } from '@/lib/ai-provider'
import { formatCategoryForAIPrompt } from '@/lib/utils'

export async function extractExpenseInformationFromImage(imageUrl: string) {
  'use server'
  const categories = await getCategories()

  const prompt = `
              This image contains a receipt.
              Read the total amount and store it as a non-formatted number without any other text or currency.
              Then guess the category for this receipt among the following categories and store its ID: ${categories.map(
    (category) => formatCategoryForAIPrompt(category),
  )}.
              Guess the expense's date and store it as yyyy-mm-dd.
              Guess a title for the expense.
              Return the amount, the category, the date and the title with just a comma between them, without anything else.`

  let responseText: string | null | undefined

  if (env.AI_PROVIDER === 'anthropic') {
    const anthropic = createAnthropicClient()
    const response = await anthropic.messages.create({
      model: AI_MODELS.anthropic.vision,
      max_tokens: 128,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image', source: { type: 'url', url: imageUrl } },
          ],
        },
      ],
    })
    const block = response.content[0]
    responseText = block.type === 'text' ? block.text : undefined
  } else {
    const openai = createOpenAIClient()
    const completion = await openai.chat.completions.create({
      model: AI_MODELS.openai.vision,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: prompt }],
        },
        {
          role: 'user',
          content: [{ type: 'image_url', image_url: { url: imageUrl } }],
        },
      ],
    })
    responseText = completion.choices.at(0)?.message.content
  }

  const [amountString, categoryId, date, title] =
    responseText?.split(',') ?? [null, null, null, null]
  return { amount: Number(amountString), categoryId, date, title }
}

export type ReceiptExtractedInfo = Awaited<
  ReturnType<typeof extractExpenseInformationFromImage>
>
