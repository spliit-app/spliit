import { getRequestConfig } from 'next-intl/server'
import { getUserLocale } from './lib/locale'

export const locales = ['en-US', 'de', 'fi'] as const
export type Locale = (typeof locales)[number]
export type Locales = ReadonlyArray<Locale>
export const defaultLocale: Locale = 'en-US'

export default getRequestConfig(async () => {
  const locale = await getUserLocale()

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
