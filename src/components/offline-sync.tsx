'use client'

import { useToast } from '@/components/ui/use-toast'
import { flushOfflineQueue, isOfflineQueueSupported } from '@/lib/offline-queue'
import { trpc } from '@/trpc/client'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef } from 'react'

const SAVED_OFFLINE_FLAG = 'spliit-saved-offline'

/** Leaves a note for the next page load to toast "Saved offline, will sync". */
export function markSavedOffline() {
  try {
    sessionStorage.setItem(SAVED_OFFLINE_FLAG, '1')
  } catch {
    // Storage blocked: the queued row in the list still says it all.
  }
}

function takeSavedOfflineFlag() {
  try {
    const value = sessionStorage.getItem(SAVED_OFFLINE_FLAG)
    sessionStorage.removeItem(SAVED_OFFLINE_FLAG)
    return value === '1'
  } catch {
    return false
  }
}

/** Same-origin group pages that should not wait on the client router offline. */
const GROUP_PATH = /^\/groups\/[^/]+(?:\/|$)/

/**
 * Replays expenses queued offline (src/lib/offline-queue.ts): on mount, when
 * the browser comes back online, and when the tab becomes visible. Also,
 * while online, loads the categories and asks the service worker to keep this
 * group's expense list and create form cached for the next offline visit, and
 * while offline turns group links into full page loads, because the Next
 * router waits for the network before a client-side navigation.
 */
export function OfflineSync({ groupId }: { groupId: string }) {
  const utils = trpc.useUtils()
  const { toast } = useToast()
  const t = useTranslations('Offline')

  const latest = useRef({ utils, toast, t })
  useEffect(() => {
    latest.current = { utils, toast, t }
  })

  const flush = useCallback(async () => {
    if (!isOfflineQueueSupported() || !navigator.onLine) return
    const { utils } = latest.current
    try {
      const { synced } = await flushOfflineQueue((item) =>
        utils.client.groups.expenses.create.mutate({
          groupId: item.groupId,
          expenseFormValues: item.expenseFormValues,
          participantId: item.participantId,
          expenseId: item.expenseId,
        }),
      )
      if (synced.length === 0) return
      const { toast, t } = latest.current
      utils.groups.expenses.invalidate()
      utils.groups.balances.invalidate()
      utils.groups.stats.invalidate()
      utils.groups.activities.invalidate()
      toast({ title: t('synced', { count: synced.length }) })
    } catch (error) {
      console.error('Offline queue flush failed', error)
    }
  }, [])

  useEffect(() => {
    if (takeSavedOfflineFlag()) {
      const { toast, t } = latest.current
      toast({ title: t('savedOffline') })
    }
  }, [])

  useEffect(() => {
    flush()
    const onVisible = () => {
      if (document.visibilityState === 'visible') flush()
    }
    window.addEventListener('online', flush)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('online', flush)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [flush])

  useEffect(() => {
    if (!navigator.onLine) return
    // The expense form needs the categories, and the expense list does not
    // load them: fetch them now so they are persisted for offline use.
    latest.current.utils.categories.list.prefetch().catch(() => {})
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.ready
      .then((registration) =>
        registration.active?.postMessage({ type: 'WARM_GROUP', groupId }),
      )
      .catch(() => {})
  }, [groupId])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (navigator.onLine) return
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return
      const anchor = (event.target as Element | null)?.closest?.('a[href]')
      if (!(anchor instanceof HTMLAnchorElement)) return
      if (anchor.target && anchor.target !== '_self') return
      if (anchor.hasAttribute('download')) return
      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin) return
      if (!GROUP_PATH.test(url.pathname)) return
      // A full load goes through the service worker's cached pages.
      event.preventDefault()
      event.stopPropagation()
      window.location.assign(url.href)
    }
    window.addEventListener('click', onClick, true)
    return () => window.removeEventListener('click', onClick, true)
  }, [])

  return null
}
