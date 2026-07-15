"use client"

import { flushSync } from "react-dom"
import { useTheme } from "next-themes"

// Troca de tema com crossfade: a mudança de classe roda dentro de uma View
// Transition e o navegador anima a passagem entre os dois temas (duração
// definida no globals.css). Em navegadores sem a API, a troca é imediata.
// O flushSync garante que o novo tema já esteja no DOM quando o snapshot
// "novo" da transição é capturado.
export function useThemeTransition() {
  const { resolvedTheme, setTheme } = useTheme()

  function setThemeWithTransition(theme: string) {
    if (!document.startViewTransition) {
      setTheme(theme)
      return
    }
    document.startViewTransition(() => {
      flushSync(() => setTheme(theme))
    })
  }

  return { resolvedTheme, setThemeWithTransition }
}
