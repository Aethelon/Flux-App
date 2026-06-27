"use client"

import { Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"

export function DarkModeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)

  if (!mounted) {
    return <div className="w-9 h-9" />
  }

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="flex items-center justify-center size-12.5 rounded-xl
        text-(--color-text-secondary) hover:text-(--color-text-primary)
        hover:bg-(--color-surface-raised) transition-colors"
      title="Alternar tema"
    >
      {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
