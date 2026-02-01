'use server'

import { env } from '@/lib/env'
import { prisma } from '@/lib/prisma'
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3'

/**
 * Delete S3 documents for a group's expenses
 * This is a server action to safely use env variables
 */
export async function deleteGroupS3Documents(groupId: string): Promise<void> {
  // Get all documents for this group's expenses
  const documents = await prisma.expenseDocument.findMany({
    where: {
      Expense: {
        groupId: groupId,
      },
    },
  })

  await deleteS3DocumentsByUrls(documents.map((d) => d.url))
}

/**
 * Delete S3 documents for a specific expense
 * This is a server action to safely use env variables
 */
export async function deleteExpenseS3Documents(
  expenseId: string,
): Promise<void> {
  // Get all documents for this expense
  const documents = await prisma.expenseDocument.findMany({
    where: {
      expenseId: expenseId,
    },
  })

  await deleteS3DocumentsByUrls(documents.map((d) => d.url))
}

/**
 * Helper function to delete S3 objects by URLs
 */
async function deleteS3DocumentsByUrls(urls: string[]): Promise<void> {
  // Delete S3 documents if credentials are available
  if (
    urls.length > 0 &&
    env.S3_UPLOAD_BUCKET &&
    env.S3_UPLOAD_REGION &&
    env.S3_UPLOAD_KEY &&
    env.S3_UPLOAD_SECRET
  ) {
    const s3Client = new S3Client({
      region: env.S3_UPLOAD_REGION,
      credentials: {
        accessKeyId: env.S3_UPLOAD_KEY,
        secretAccessKey: env.S3_UPLOAD_SECRET,
      },
      ...(env.S3_UPLOAD_ENDPOINT && { endpoint: env.S3_UPLOAD_ENDPOINT }),
    })

    for (const url of urls) {
      try {
        // Extract the S3 key from the URL using URL parsing
        const parsedUrl = new URL(url)
        // Remove leading slash from pathname to get the key
        const key = parsedUrl.pathname.startsWith('/')
          ? parsedUrl.pathname.slice(1)
          : parsedUrl.pathname

        if (key) {
          await s3Client.send(
            new DeleteObjectCommand({
              Bucket: env.S3_UPLOAD_BUCKET,
              Key: key,
            }),
          )
        }
      } catch (error) {
        console.error(`Failed to delete S3 object from URL: ${url}`, error)
      }
    }
  }
}
