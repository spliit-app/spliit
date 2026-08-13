import { ComponentType, PropsWithChildren } from 'react'
import { AnalyticsEvent } from './events'
import { AnalyticsProviderId } from './provider-ids'

/**
 * Provider-specific settings, resolved from the environment on the server and
 * serialized to the client. Never put a secret in here: it ends up in the HTML.
 *
 * Deliberately untyped per provider, so adding a provider never changes this
 * file. Each provider documents the keys it reads; `src/lib/env.ts` enforces
 * the ones it cannot work without.
 */
export type AnalyticsOptions = Record<string, string | undefined>

/**
 * What a provider implements: send one event somewhere. `url` is absolute and
 * has already been anonymized — send it as given rather than letting an SDK
 * fall back to `location.href`, which on a group page carries the group ID.
 */
export type AnalyticsTransport = (
  event: string,
  props: Record<string, string>,
  url: string,
) => void

export type AnalyticsProviderDefinition = {
  /** Optional script or SDK injection, rendered once near the root of the page. */
  Script?: ComponentType<{ options: AnalyticsOptions }>
  /** Returns the transport. Called as a hook, so it may use hooks itself. */
  useTransport: (options: AnalyticsOptions) => AnalyticsTransport
}

export type AnalyticsProviderComponent = ComponentType<
  PropsWithChildren<{ options: AnalyticsOptions }>
>

/**
 * What call sites use. `path` is the page the event should be attributed to; it
 * defaults to `/` and is anonymized before it reaches any provider.
 */
export type SendEvent = (event: AnalyticsEvent, path?: string) => void

export type AnalyticsConfig = {
  provider: AnalyticsProviderId | null
  options: AnalyticsOptions
}
