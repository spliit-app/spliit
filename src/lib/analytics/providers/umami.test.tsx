import { useAnalytics } from '@/lib/analytics/context'
import { UmamiAnalyticsProvider } from '@/lib/analytics/providers/umami'
import { SendEvent } from '@/lib/analytics/types'
import { act, render } from '@testing-library/react'
import type Script from 'next/script'
import { ComponentProps } from 'react'

// Stands in for `next/script`, which would inject a real script tag: the
// provider's `Script` renders nothing, and the test reads the props it received
// — including `onLoad`, which the provider relies on to replay queued events.
const mockScript = jest.fn<null, [ComponentProps<typeof Script>]>(() => null)
jest.mock('next/script', () => ({
  __esModule: true,
  default: (props: ComponentProps<typeof Script>) => mockScript(props),
}))

function CallSite({ onReady }: { onReady: (sendEvent: SendEvent) => void }) {
  onReady(useAnalytics())
  return null
}

/** The tracker's own defaults, as `umami.track(fn)` hands them to `fn`. */
const trackerDefaults = {
  website: 'website-id',
  hostname: 'localhost',
  screen: '1x1',
  language: 'en-US',
  title: 'Expenses · Trip to Rome · Spliit',
  url: 'http://localhost/groups/exampleGroupId0000000/expenses',
  referrer: '',
}

/** Renders the provider and returns what a call site and the tracker see. */
function setup(options = { websiteId: 'website-id' }) {
  let sendEvent: SendEvent | undefined
  render(
    <UmamiAnalyticsProvider options={options}>
      <CallSite onReady={(s) => (sendEvent = s)} />
    </UmamiAnalyticsProvider>,
  )
  const track = jest.fn()
  window.umami = { track }
  const lastPayload = (defaults = trackerDefaults) => {
    expect(track).toHaveBeenCalledTimes(1)
    return track.mock.calls[0][0](defaults)
  }
  return { sendEvent: sendEvent!, track, lastPayload }
}

afterEach(() => {
  delete window.umami
  mockScript.mockClear()
})

describe('UmamiAnalyticsProvider', () => {
  it('loads the tracker with automatic tracking off', () => {
    setup({ websiteId: 'website-id' })
    expect(mockScript).toHaveBeenCalledWith(
      expect.objectContaining({
        src: 'https://cloud.umami.is/script.js',
        'data-website-id': 'website-id',
        'data-auto-track': 'false',
      }),
    )
  })

  it('points the tracker at a self-hosted or first-party instance', () => {
    setup({
      websiteId: 'website-id',
      scriptUrl: '/js/umami.js',
      hostUrl: '/proxy/umami',
    } as { websiteId: string })
    expect(mockScript).toHaveBeenCalledWith(
      expect.objectContaining({
        src: '/js/umami.js',
        'data-host-url': '/proxy/umami',
      }),
    )
  })

  it('sends a pageview with the anonymized URL and no title', () => {
    const { sendEvent, lastPayload } = setup()
    act(() => {
      sendEvent(
        { event: 'pageview', props: {} },
        '/groups/exampleGroupId0000000/expenses',
      )
    })

    const payload = lastPayload()
    expect(payload).toMatchObject({
      website: 'website-id',
      url: 'http://localhost/groups/[groupId]/expenses',
      title: undefined,
    })
    // Without a name, Umami records a pageview.
    expect(payload).not.toHaveProperty('name')
    expect(payload).not.toHaveProperty('data')
  })

  it('sends a custom event with its name and properties', () => {
    const { sendEvent, lastPayload } = setup()
    act(() => {
      sendEvent(
        { event: 'group: export expenses', props: { format: 'csv' } },
        '/groups/exampleGroupId0000000/expenses/export',
      )
    })

    expect(lastPayload()).toMatchObject({
      name: 'group: export expenses',
      data: { format: 'csv' },
      url: 'http://localhost/groups/[groupId]/expenses/export',
    })
  })

  it('drops a same-origin referrer, which the tracker keeps as a path', () => {
    const { sendEvent, lastPayload } = setup()
    act(() => {
      sendEvent({ event: 'pageview', props: {} }, '/groups')
    })

    expect(
      lastPayload({
        ...trackerDefaults,
        referrer: '/groups/exampleGroupId0000000/expenses',
      }).referrer,
    ).toBe('')
  })

  it('keeps an external referrer', () => {
    const { sendEvent, lastPayload } = setup()
    act(() => {
      sendEvent({ event: 'pageview', props: {} }, '/')
    })

    expect(
      lastPayload({ ...trackerDefaults, referrer: 'https://example.com/post' })
        .referrer,
    ).toBe('https://example.com/post')
  })

  it('queues events sent before the tracker has loaded', () => {
    let sendEvent: SendEvent | undefined
    render(
      <UmamiAnalyticsProvider options={{ websiteId: 'website-id' }}>
        <CallSite onReady={(s) => (sendEvent = s)} />
      </UmamiAnalyticsProvider>,
    )
    // No `window.umami` yet: the script has not loaded.
    act(() => {
      sendEvent!({ event: 'pageview', props: {} }, '/groups')
      sendEvent!({ event: 'group: create', props: {} }, '/groups/create')
    })

    const track = jest.fn()
    window.umami = { track }
    expect(track).not.toHaveBeenCalled()

    const { onLoad } = mockScript.mock.calls[0][0]
    act(() => {
      onLoad!(new Event('load'))
    })

    expect(track).toHaveBeenCalledTimes(2)
    expect(track.mock.calls[0][0](trackerDefaults)).toMatchObject({
      url: 'http://localhost/groups',
    })
    expect(track.mock.calls[1][0](trackerDefaults)).toMatchObject({
      name: 'group: create',
      url: 'http://localhost/groups/create',
    })
  })
})
