import { FeedbackButtonClient } from '@/components/feedback-button/feedback-button-client'
import { formSchema } from '@/components/feedback-button/feedback-button-common'
import { FeedbackButtonEmail } from '@/components/feedback-button/feedback-button-email'
import { env } from '@/lib/env'
import { getResend } from '@/lib/resend'

export function FeedbackButton() {
  async function sendFeedback(values: unknown) {
    'use server'
    const { email, message } = formSchema.parse(values)
    const resend = getResend()
    if (!resend || !env.FEEDBACK_EMAIL_FROM || !env.FEEDBACK_EMAIL_TO) {
      console.warn(
        'Resend is not properly configured. Feedback email won’t be sent.',
      )
      return
    }
    await resend.emails.send({
      from: env.FEEDBACK_EMAIL_FROM,
      to: env.FEEDBACK_EMAIL_TO,
      subject: `Spliit: new feedback from ${email || 'anonymous user'}`,
      react: <FeedbackButtonEmail email={email} message={message} />,
    })
  }

  return <FeedbackButtonClient sendFeedback={sendFeedback} />
}
