import { randomId } from '@/lib/api'
import { POST as route } from 'next-s3-upload/route'

export const POST = route.configure({
  key(req, filename) {
    const [, extension] = filename.match(/(\.[^\.]*)$/) ?? [null, '']
    const timestamp = new Date().toISOString()
    const random = randomId()
    return `document-${timestamp}-${random}${extension.toLowerCase()}`
  },
})
