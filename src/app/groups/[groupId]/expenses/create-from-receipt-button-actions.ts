'use server'
import { getCategories } from '@/lib/api'
import { env } from '@/lib/env'
import { formatCategoryForAIPrompt, formatParticipantForAIPrompt } from '@/lib/utils'
import { Participant } from '@prisma/client'
import OpenAI from 'openai'
import { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/index.mjs'

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

export async function extractExpenseInformationFromImage(imageUrl: string, participants: Participant[]) {
  'use server'
  const categories = await getCategories()

  const body: ChatCompletionCreateParamsNonStreaming = {
    model: 'gpt-4-vision-preview',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `
              This image contains a receipt.
              Read the total amount and store it as a non-formatted number without any other text or currency.
              Then guess the category for this receipt amoung the following categories and store its ID: ${categories.map(
              (category) => formatCategoryForAIPrompt(category),
            )}.
              Guess the expense’s date and store it as yyyy-mm-dd.
              Guess a title for the expense.
              Return the amount, the category, the date and the title with just a comma between them, without anything else in one line. At the end of that line write BABABINGO

              Then in next  line read the names of the people involved and store them together with the amounts they owe in a JSON array format of participantId, participantName and amount;
              You can guess the participantId from the name using this list ${participants.map(participant => formatParticipantForAIPrompt(participant))}`,
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

  const [basicInfoString, participantString] = completion.choices.at(0)?.message.content?.split('BABABINGO') as string[];
  const [amountString, categoryId, date, title] = basicInfoString.split(',') ?? [null, null, null, null];
  const receiptParticipants = JSON.parse(participantString) as { participantId: string, participantName: string, amount: number }[];

  return { amount: Number(amountString), categoryId, date, title, receiptParticipants }
}

export type ReceiptExtractedInfo = Awaited<
  ReturnType<typeof extractExpenseInformationFromImage>
>
