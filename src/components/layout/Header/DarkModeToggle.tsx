"use client"

import { Sun, Moon } from "lucide-react"
import { useSyncExternalStore } from "react"
import { useThemeTransition } from "@/lib/useThemeTransition"
import { useLocale } from "../LocaleProvider"
import { interfaceCopy } from "@/lib/interfaceCopy"

export function DarkModeToggle() {
  const { resolvedTheme, setThemeWithTransition } = useThemeTransition()
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)
  const { locale } = useLocale()
  const label = interfaceCopy[locale].theme

  if (!mounted) {
    return <div className="size-11 lg:size-12.5" />
  }

  return (
    <button
      onClick={() => setThemeWithTransition(resolvedTheme === "dark" ? "light" : "dark")}
      className="flex items-center justify-center size-11 rounded-xl lg:size-12.5
        text-(--color-text-secondary) hover:text-(--color-text-primary)
        hover:bg-(--color-surface-raised) transition-colors"
      title={label}
      aria-label={label}
    >
      {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
