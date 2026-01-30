import { env } from '@/lib/env'
import { prisma } from '@/lib/prisma'
import { buildObjectUrl, getS3Client } from '@/lib/s3'
import { PutObjectCommand } from '@aws-sdk/client-s3'

const s3 = getS3Client()
const SERVER_MAX_FILE_SIZE = Number(
  process.env.NEXT_PUBLIC_S3_MAX_FILE_SIZE ?? 5 * 1024 * 1024,
)

export async function POST(req: Request) {
  try {
    if (!s3) {
      return new Response(JSON.stringify({ error: 'S3 upload not enabled' }), {
        status: 501,
      })
    }

    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file)
      return new Response(JSON.stringify({ error: 'no file' }), { status: 400 })
    const expenseId = form.get('expenseId') as string | null

    const widthParam = form.get('width')
    const heightParam = form.get('height')

    if (!widthParam || !heightParam) {
      return new Response(
        JSON.stringify({ error: 'missing width or height' }),
        { status: 400 },
      )
    }

    const width = widthParam ? Number(widthParam) : 0
    const height = heightParam ? Number(heightParam) : 0

    const arrayBuffer = await file.arrayBuffer()
    const body = Buffer.from(arrayBuffer)

    if (body.length > SERVER_MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: 'file too large' }), {
        status: 413,
      })
    }

    const id = crypto.randomUUID()
    const filename = file.name || `${id}`
    const key = `uploads/${id}`

    await s3.send(
      new PutObjectCommand({
        Bucket: env.S3_UPLOAD_BUCKET!,
        Key: key,
        Body: body,
        ContentType: file.type || 'application/octet-stream',
        ContentDisposition: `attachment; filename="${encodeURIComponent(
          filename,
        )}"`,
      }),
    )

    const url = buildObjectUrl(key)

    // create DB record in ExpenseDocument
    const created = await prisma.expenseDocument.create({
      data: {
        id,
        url,
        width,
        height,
        expenseId: expenseId || undefined,
      },
    })

    return new Response(JSON.stringify({ ...created, filename }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'upload failed' }), {
      status: 500,
    })
  }
}
