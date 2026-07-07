"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export type FontSize = "pequena" | "padrao" | "grande"

export const FONT_SIZE_SCALE: Record<FontSize, number> = {
  pequena: 0.9,
  padrao: 1,
  grande: 1.15,
}

interface FontSizeStore {
  fontSize: FontSize
  setFontSize: (size: FontSize) => void
}

export const useFontSizeStore = create<FontSizeStore>()(
  persist(
    (set) => ({
      fontSize: "padrao",
      setFontSize: (fontSize) => set({ fontSize }),
    }),
    { name: "flux-font-size" }
  )
)
