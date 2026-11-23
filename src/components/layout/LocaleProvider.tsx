"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { LOCALE_COOKIE, type Locale } from "@/lib/locale"

const LocaleContext = createContext<{
  locale: Locale
  setLocale: (locale: Locale) => void
} | null>(null)

export function LocaleProvider({ initialLocale, children }: { initialLocale: Locale; children: ReactNode }) {
  const [locale, updateLocale] = useState(initialLocale)

  function setLocale(nextLocale: Locale) {
    const secure = window.location.protocol === "https:" ? "; Secure" : ""
    document.cookie = `${LOCALE_COOKIE}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`
    document.documentElement.lang = nextLocale
    updateLocale(nextLocale)
  }

  return <LocaleContext value={{ locale, setLocale }}>{children}</LocaleContext>
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) throw new Error("useLocale must be used within LocaleProvider")
  return context
}
