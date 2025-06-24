import { getRequestConfig } from 'next-intl/server'
import { getUserLocale } from './lib/locale'

// helper to merge locale-specific messages with the English defaults
function mergeDeep<T>(target: T, source: Partial<T>): T {
  for (const key in source) {
    const value = (source as any)[key]
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      ;(target as any)[key] = mergeDeep((target as any)[key] || {}, value)
    } else {
      ;(target as any)[key] = value
    }
  }
  return target
}


export const localeLabels = {
  'en-US': 'English',
  fi: 'Suomi',
  'fr-FR': 'Français',
  es: 'Español',
  'de-DE': 'Deutsch',
  'zh-CN': '简体中文',
  'zh-TW': '正體中文',
  'pl-PL': 'Polski',
  'ru-RU': 'Русский',
  'it-IT': 'Italiano',
  'ua-UA': 'Українська',
  ro: 'Română',
  'tr-TR': 'Türkçe',
  'pt-BR': 'Português Brasileiro',
  'nl-NL': 'Nederlands',
} as const

export const locales: (keyof typeof localeLabels)[] = Object.keys(
  localeLabels,
) as any
export type Locale = keyof typeof localeLabels
export type Locales = ReadonlyArray<Locale>
export const defaultLocale: Locale = 'en-US'

export default getRequestConfig(async () => {
  const locale = await getUserLocale()

  const defaultMessages = (await import('../messages/en-US.json')).default
  const localeMessages = (await import(`../messages/${locale}.json`)).default

  const messages = mergeDeep(structuredClone(defaultMessages), localeMessages)


  return {
    locale,   
    messages,
  }
})
