import deepmerge from 'deepmerge'
import { getRequestConfig } from 'next-intl/server'
import { getUserLocale } from './lib/locale'

export const localeLabels = {
  'en-US': 'English',
  fi: 'Suomi',
  'fr-FR': 'Français',
  es: 'Español',
  'de-DE': 'Deutsch',
  'zh-CN': '简体中文',
  'zh-TW': '正體中文',
  'ja-JP': '日本語',
  'pl-PL': 'Polski',
  'ru-RU': 'Русский',
  'it-IT': 'Italiano',
  'ua-UA': 'Українська',
  ro: 'Română',
  'tr-TR': 'Türkçe',
  'pt-BR': 'Português Brasileiro',
  'nl-NL': 'Nederlands',
  ca: 'Català',
  'cs-CZ': 'Česky',
} as const

export const locales: (keyof typeof localeLabels)[] = Object.keys(
  localeLabels,
) as any
export type Locale = keyof typeof localeLabels
export type Locales = ReadonlyArray<Locale>
export const defaultLocale: Locale = 'en-US'

export default getRequestConfig(async () => {
  const locale = await getUserLocale()
  const localeMessages = (await import(`../messages/${locale}.json`)).default

  let messages: any
  if (locale === defaultLocale) {
    messages = localeMessages
  } else {
    messages = deepmerge(
      (await import(`../messages/${defaultLocale}.json`)).default,
      localeMessages,
    ) as any
  }

  return {
    locale,
    messages,
  }
})
