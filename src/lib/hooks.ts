import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import useSWR, { Fetcher } from 'swr'

export function useMediaQuery(query: string): boolean {
  const getMatches = (query: string): boolean => {
    // Prevents SSR issues
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches
    }
    return false
  }

  const [matches, setMatches] = useState<boolean>(getMatches(query))

  function handleChange() {
    setMatches(getMatches(query))
  }

  useEffect(() => {
    const matchMedia = window.matchMedia(query)

    // Triggered at the first client-side load and if query changes
    handleChange()

    // Listen matchMedia
    if (matchMedia.addListener) {
      matchMedia.addListener(handleChange)
    } else {
      matchMedia.addEventListener('change', handleChange)
    }

    return () => {
      if (matchMedia.removeListener) {
        matchMedia.removeListener(handleChange)
      } else {
        matchMedia.removeEventListener('change', handleChange)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  return matches
}

export function useBaseUrl() {
  const [baseUrl, setBaseUrl] = useState<string | null>(null)
  useEffect(() => {
    setBaseUrl(window.location.origin)
  }, [])
  return baseUrl
}

/**
 * @returns The active user, or `null` until it is fetched from local storage
 */
export function useActiveUser(groupId?: string) {
  const [activeUser, setActiveUser] = useState<string | null>(null)

  useEffect(() => {
    if (groupId) {
      const activeUser = localStorage.getItem(`${groupId}-activeUser`)
      if (activeUser) setActiveUser(activeUser)
    }
  }, [groupId])

  return activeUser
}

interface FrankfurterAPIResponse {
  base: string
  date: string
  rates: Record<string, number>
}

const fetcher: Fetcher<FrankfurterAPIResponse> = (url: string) =>
  fetch(url).then(async (res) => {
    if (!res.ok)
      throw new TypeError('Unsuccessful response from API', { cause: res })
    return res.json() as Promise<FrankfurterAPIResponse>
  })

export function useCurrencyRate(
  date: Date,
  baseCurrency: string,
  targetCurrency: string,
) {
  const dateString = dayjs(date).format('YYYY-MM-DD')

  // Only send request if both currency codes are given and not the same
  const url =
    !isNaN(date.getTime()) &&
    !!baseCurrency.length &&
    !!targetCurrency.length &&
    baseCurrency !== targetCurrency &&
    `https://api.frankfurter.app/${dateString}?base=${baseCurrency}`
  const { data, error, isLoading, mutate } = useSWR<FrankfurterAPIResponse>(
    url,
    fetcher,
    { shouldRetryOnError: false, revalidateOnFocus: false },
  )

  if (data) {
    let exchangeRate = undefined
    let sentError = error
    if (!error && data.date !== dateString) {
      // this happens if for example, the requested date is in the future.
      sentError = new RangeError(data.date)
    }
    if (data.rates[targetCurrency]) {
      exchangeRate = data.rates[targetCurrency]
    }
    return {
      data: exchangeRate,
      error: sentError,
      isLoading,
      refresh: mutate,
    }
  }

  return {
    data,
    error,
    isLoading,
    refresh: mutate,
  }
}
