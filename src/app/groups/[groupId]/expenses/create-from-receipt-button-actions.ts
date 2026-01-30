'use server'
import { getCategories } from '@/lib/api'
import { env } from '@/lib/env'
import { prisma } from '@/lib/prisma'
import { getS3Client, parseObjectKeyFromUrl } from '@/lib/s3'
import { formatCategoryForAIPrompt } from '@/lib/utils'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import OpenAI from 'openai'
import { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/index.mjs'

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  baseURL: env.OPENAI_BASE_URL,
})

const s3 = getS3Client()

async function resolveDocumentToPresignedUrl(id: string): Promise<string> {
  // Lookup DB record by id
  const doc = await prisma.expenseDocument.findUnique({ where: { id } })
  if (!doc || !doc.url) throw new Error('Document not found.')

  // derive s3 key from stored doc.url and presign
  const key = parseObjectKeyFromUrl(String(doc.url))

  if (!s3) throw new Error('S3 client not configured')

  const command = new GetObjectCommand({
    Bucket: env.S3_UPLOAD_BUCKET!,
    Key: key,
  })

  const presigned = await getSignedUrl(s3, command, { expiresIn: 60 * 5 })
  return presigned as string
}

export async function extractExpenseInformationFromImage(id: string) {
  'use server'
  if (!env.NEXT_PUBLIC_ENABLE_RECEIPT_EXTRACT)
    throw new Error('Receipt extraction is not enabled')

  const categories = await getCategories()

  const resolvedUrl = await resolveDocumentToPresignedUrl(id)
  if (!resolvedUrl) throw new Error('No document URL available for extraction')

  const body: ChatCompletionCreateParamsNonStreaming = {
    model: env.OPENAI_IMAGE_MODEL || 'gpt-5-nano',
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
          { type: 'image_url', image_url: { url: resolvedUrl } },
        ],
      },
    ],
  }

  const completion = await openai.chat.completions.create(body)

  const raw = completion.choices?.[0]?.message?.content
  const parts = (raw || '').split(',').map((p: string) => p?.trim())
  const [amountString, categoryId, date, title] = [
    parts[0] ?? null,
    parts[1] ?? null,
    parts[2] ?? null,
    parts.slice(3).join(',') || null,
  ]

  return {
    amount: amountString ? Number(amountString) : NaN,
    categoryId,
    date,
    title,
  }
}

export type ReceiptExtractedInfo = Awaited<
  ReturnType<typeof extractExpenseInformationFromImage>
>
