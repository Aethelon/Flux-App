"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Category } from "@/types/settings"

const INITIAL_CATEGORIES: Category[] = [
  { id: "1", name: "Matéria-Prima" },
  { id: "2", name: "Produto Acabado" },
  { id: "3", name: "Embalagem" },
  { id: "4", name: "Serviços" },
]

interface CategoriesStore {
  categories: Category[]
  addCategory: (name: string) => void
  updateCategory: (id: string, name: string) => void
  removeCategory: (id: string) => void
}

export const useCategoriesStore = create<CategoriesStore>()(
  persist(
    (set) => ({
      categories: INITIAL_CATEGORIES,
      addCategory: (name) =>
        set((state) => ({
          categories: [...state.categories, { id: String(Date.now()), name }],
        })),
      updateCategory: (id, name) =>
        set((state) => ({
          categories: state.categories.map((c) => (c.id === id ? { ...c, name } : c)),
        })),
      removeCategory: (id) =>
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
        })),
    }),
    { name: "flux-categories" }
  )
)
