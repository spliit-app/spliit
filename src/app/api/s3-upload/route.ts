import { randomId } from '@/lib/api'
import { getSessionFromRequest } from '@/lib/auth-server'
import { env } from '@/lib/env'
import { POST as route } from 'next-s3-upload/route'
import type { NextRequest } from 'next/server'

const uploadRoute = route.configure({
  key(req, filename) {
    const [, extension] = filename.match(/(\.[^\.]*)$/) ?? [null, '']
    const timestamp = new Date().toISOString()
    const random = randomId()
    return `document-${timestamp}-${random}${extension.toLowerCase()}`
  },
  endpoint: env.S3_UPLOAD_ENDPOINT,
  // forcing path style is only necessary for providers other than AWS
  forcePathStyle: !!env.S3_UPLOAD_ENDPOINT,
})

// Presigned uploads used to be anonymous, which let anyone hand the bucket
// arbitrary files. Requiring a session is the cheapest correct fix; scoping an
// upload to a specific group belongs with the membership work.
export async function POST(request: NextRequest) {
  if (!(await getSessionFromRequest(request))) {
    return new Response(null, { status: 401 })
  }
  return uploadRoute(request)
}
