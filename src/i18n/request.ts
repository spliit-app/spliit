import deepmerge from 'deepmerge'
import { getRequestConfig } from 'next-intl/server'
import { getUserLocale } from '../lib/locale'

export const localeLabels = {
  id: 'Bahasa Indonesia',
  ca: 'Català',
  'cs-CZ': 'Česky',
  'de-DE': 'Deutsch',
  'en-US': 'English',
  es: 'Español',
  eu: 'Euskera',
  'fr-FR': 'Français',
  'it-IT': 'Italiano',
  'nl-NL': 'Nederlands',
  'pl-PL': 'Polski',
  pt: 'Português',
  'pt-BR': 'Português Brasileiro',
  ro: 'Română',
  fi: 'Suomi',
  'tr-TR': 'Türkçe',
  'ru-RU': 'Русский',
  'uk-UA': 'Українська',
  he: 'עברית',
  ko: '한국어',
  'ja-JP': '日本語',
  'zh-CN': '简体中文',
  'zh-TW': '正體中文',
} as const

export const locales: (keyof typeof localeLabels)[] = Object.keys(
  localeLabels,
) as any
export type Locale = keyof typeof localeLabels
export type Locales = ReadonlyArray<Locale>
export const defaultLocale: Locale = 'en-US'

export default getRequestConfig(async () => {
  const locale = await getUserLocale()
  const localeMessages = (await import(`../../messages/${locale}.json`)).default

  let messages: any
  if (locale === defaultLocale) {
    messages = localeMessages
  } else {
    messages = deepmerge(
      (await import(`../../messages/${defaultLocale}.json`)).default,
      localeMessages,
    ) as any
  }

  return {
    locale,
    messages,
  }
})
