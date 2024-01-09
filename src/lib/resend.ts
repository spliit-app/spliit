import { env } from '@/lib/env'
import { Resend } from 'resend'

export const getResend = () =>
  env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null
