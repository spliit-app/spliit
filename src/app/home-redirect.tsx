'use client'

import {
  getRecentGroups,
  getStartupRedirectEnabled,
} from '@/app/groups/recent-groups-helpers'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function HomeRedirect() {
  const router = useRouter()

  useEffect(() => {
    if (!sessionStorage.getItem('sessionStarted')) {
      sessionStorage.setItem('sessionStarted', '1')
      if (getStartupRedirectEnabled()) {
        const groups = getRecentGroups()
        if (groups.length > 0) {
          router.replace(`/groups/${groups[0].id}`)
          return
        }
      }
    }
  }, [router])

  return null
}
