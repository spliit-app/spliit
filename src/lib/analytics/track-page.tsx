'use client'

import { useAnalytics } from '@/lib/analytics/context'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'

type Props = {
  path: string
}

/**
 * Sends a pageview for the page it is rendered in. Pages are tracked explicitly
 * rather than automatically: a route sends nothing until someone adds this to
 * it, which keeps a new route out of analytics until that is a deliberate,
 * reviewable decision.
 *
 * `path` is anonymized before it is sent, so passing one built from a group ID
 * is safe.
 */
export function TrackPage(props: Props) {
  return (
    // `useSearchParams` opts the whole route out of static rendering unless it
    // is read inside a Suspense boundary.
    <Suspense>
      <TrackPage_ {...props} />
    </Suspense>
  )
}

function TrackPage_({ path }: Props) {
  const sendEvent = useAnalytics()
  const searchParams = useSearchParams()
  // Kept so that campaign and share links stay attributable. Every other query
  // parameter is dropped: the expense creation route carries the title and
  // amount in its query string.
  const ref = searchParams.get('ref')

  useEffect(() => {
    sendEvent(
      { event: 'pageview', props: {} },
      `${path}${ref ? `?ref=${ref}` : ''}`,
    )
  }, [path, ref, sendEvent])

  return null
}
