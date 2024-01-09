import { Heading } from '@react-email/heading'
import { Html } from '@react-email/html'
import { Preview } from '@react-email/preview'
import { Text } from '@react-email/text'

type Props = {
  email?: string
  message: string
}

export function FeedbackButtonEmail({ email, message }: Props) {
  return (
    <Html>
      <Preview>New feedback from {email || 'anonymous user'}</Preview>
      <Heading>New feedback on Spliit</Heading>
      <Text>
        Email address: <strong>{email || 'not provided'}</strong>
      </Text>
      <pre style={{ padding: 16, borderLeft: '2px solid lightgray' }}>
        {message}
      </pre>
    </Html>
  )
}
