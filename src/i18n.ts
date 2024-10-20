import { getRequestConfig } from 'next-intl/server'
import { getUserLocale } from './lib/locale'

export const locales = [
  'en-US',
  'fi',
  'fr-FR',
  'es',
  'de-DE',
  'zh-CN',
  'ru-RU',
  'it-IT',
  'ua-UA',
  'ro',
] as const
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
