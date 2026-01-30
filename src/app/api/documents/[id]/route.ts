import { env } from '@/lib/env'
import { prisma } from '@/lib/prisma'
import { getS3Client, parseObjectKeyFromUrl } from '@/lib/s3'
import { GetObjectCommand } from '@aws-sdk/client-s3'

const s3 = getS3Client()

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }, // Note the Promise type here
) {
  try {
    if (!s3) return new Response('S3 not enabled', { status: 501 })

    const { id } = await params

    if (!id) return new Response('missing id', { status: 400 })

    const doc = await prisma.expenseDocument.findUnique({ where: { id } })
    if (!doc) return new Response('not found', { status: 404 })

    const key = parseObjectKeyFromUrl(String(doc.url))
    const command = new GetObjectCommand({
      Bucket: env.S3_UPLOAD_BUCKET,
      Key: key,
    })

    const res = await s3.send(command)

    const body = res.Body?.transformToWebStream()

    const headers: Record<string, string> = {
      'Content-Type': res.ContentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    }

    if (res.ContentLength) headers['Content-Length'] = String(res.ContentLength)

    return new Response(body as ReadableStream, { status: 200, headers })
  } catch (err) {
    console.error(err)
    return new Response('failed to fetch object', { status: 500 })
  }
}
