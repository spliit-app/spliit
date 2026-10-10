import { Analytics } from '@/lib/analytics/analytics'
import { createAnalyticsProvider, useAnalytics } from '@/lib/analytics/context'
import { AnalyticsTransport, SendEvent } from '@/lib/analytics/types'
import '@testing-library/jest-dom'
import { act, render, screen } from '@testing-library/react'

/** Hands the `sendEvent` a call site would get to the test. */
function CallSite({ onReady }: { onReady: (sendEvent: SendEvent) => void }) {
  onReady(useAnalytics())
  return <span>call site</span>
}

describe('createAnalyticsProvider', () => {
  const makeProvider = (name: string, transport: AnalyticsTransport) =>
    createAnalyticsProvider({
      Script: () => <span>{name} script</span>,
      useTransport: () => transport,
    })

  it('forwards each event to every nested provider, anonymized', () => {
    const outer = jest.fn<void, Parameters<AnalyticsTransport>>()
    const inner = jest.fn<void, Parameters<AnalyticsTransport>>()
    const Outer = makeProvider('outer', outer)
    const Inner = makeProvider('inner', inner)
    let sendEvent: SendEvent | undefined

    render(
      <Outer options={{}}>
        <Inner options={{}}>
          <CallSite onReady={(s) => (sendEvent = s)} />
        </Inner>
      </Outer>,
    )

    expect(screen.getByText('outer script')).toBeInTheDocument()
    expect(screen.getByText('inner script')).toBeInTheDocument()

    act(() => {
      sendEvent!(
        { event: 'expense: create', props: {} },
        '/groups/exampleGroupId0000000/expenses',
      )
    })

    const expected = [
      'expense: create',
      {},
      'http://localhost/groups/[groupId]/expenses',
    ]
    expect(inner).toHaveBeenCalledTimes(1)
    expect(inner).toHaveBeenCalledWith(...expected)
    expect(outer).toHaveBeenCalledTimes(1)
    expect(outer).toHaveBeenCalledWith(...expected)
  })

  it('keeps the identity of sendEvent across re-renders', () => {
    // `TrackPage` sends its pageview from an effect keyed on `sendEvent`; a new
    // identity per render would re-send it on every tRPC refetch.
    const Outer = makeProvider('outer', jest.fn())
    const Inner = makeProvider('inner', jest.fn())
    const seen: SendEvent[] = []

    // A fresh element tree each time, with fresh `options` objects, so that
    // every level actually re-renders rather than bailing out.
    const tree = () => (
      <Outer options={{}}>
        <Inner options={{}}>
          <CallSite onReady={(s) => seen.push(s)} />
        </Inner>
      </Outer>
    )
    const { rerender } = render(tree())
    rerender(tree())

    expect(seen.length).toBeGreaterThan(1)
    expect(new Set(seen).size).toBe(1)
  })
})

describe('Analytics', () => {
  it('renders children and no-ops when no provider is configured', () => {
    let sendEvent: SendEvent | undefined
    render(
      <Analytics config={{ providers: [] }}>
        <CallSite onReady={(s) => (sendEvent = s)} />
      </Analytics>,
    )

    expect(screen.getByText('call site')).toBeInTheDocument()
    expect(() =>
      sendEvent!({ event: 'group: create', props: {} }),
    ).not.toThrow()
  })

  it('mounts the configured providers from the registry', () => {
    const info = jest.spyOn(console, 'info').mockImplementation(() => {})
    let sendEvent: SendEvent | undefined
    render(
      <Analytics config={{ providers: [{ id: 'console', options: {} }] }}>
        <CallSite onReady={(s) => (sendEvent = s)} />
      </Analytics>,
    )

    act(() => {
      sendEvent!({ event: 'group: create', props: {} }, '/groups/create')
    })

    expect(info).toHaveBeenCalledWith(
      '[analytics]',
      'group: create',
      {},
      'http://localhost/groups/create',
    )
    info.mockRestore()
  })
})
