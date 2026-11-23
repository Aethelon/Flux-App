export const LOCALE_COOKIE = "flux_locale"
export const DEFAULT_LOCALE = "pt-BR"

export const LOCALE_OPTIONS = {
  "pt-BR": "Português (Brasil)",
  "en-US": "English (US)",
  es: "Español",
} as const

export type Locale = keyof typeof LOCALE_OPTIONS

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && Object.hasOwn(LOCALE_OPTIONS, value)
}
