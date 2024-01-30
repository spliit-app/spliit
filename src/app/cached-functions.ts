import { getGroup } from '@/lib/api'
import { cache } from 'react'

function logAndCache<P extends any[], R>(fn: (...args: P) => R) {
  const cached = cache((...args: P) => {
    // console.log(`Not cached: ${fn.name}…`)
    return fn(...args)
  })
  return (...args: P) => {
    // console.log(`Calling cached ${fn.name}…`)
    return cached(...args)
  }
}

export const cached = {
  getGroup: logAndCache(getGroup),
}
