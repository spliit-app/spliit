import { sanitizeKey } from 'next-s3-upload'
import { POST as route } from 'next-s3-upload/route'

export const POST = route.configure({
  key(req, filename) {
    return sanitizeKey(filename).toLowerCase()
  },
})
