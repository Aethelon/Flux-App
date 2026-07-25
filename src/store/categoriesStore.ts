"use client"

import { create } from "zustand"
import { api } from "@/lib/api"
import type { Category } from "@/types/settings"

interface CategoriesStore {
  categories: Category[]
  loadCategories: () => Promise<void>
  addCategory: (name: string) => Promise<void>
  updateCategory: (id: string, name: string) => Promise<void>
  removeCategory: (id: string) => Promise<void>
}

export const useCategoriesStore = create<CategoriesStore>((set, get) => ({
  categories: [],
  loadCategories: async () => {
    set({ categories: await api.get("categories").json<Category[]>() })
  },
  addCategory: async (name) => {
    const created = await api.post("categories", {
      json: { name },
    }).json<Category>()
    set((state) => ({ categories: [...state.categories, created] }))
  },
  updateCategory: async (id, name) => {
    const current = get().categories.find((item) => item.id === id)
    if (!current) return
    const updated = await api.patch(`categories/${id}`, {
      json: { version: current.version, name },
    }).json<Category>()
    set((state) => ({
      categories: state.categories.map((item) => item.id === id ? updated : item),
    }))
  },
  removeCategory: async (id) => {
    const current = get().categories.find((item) => item.id === id)
    if (!current) return
    await api.delete(`categories/${id}`, {
      searchParams: { version: current.version },
    })
    set((state) => ({
      categories: state.categories.filter((item) => item.id !== id),
    }))
  },
}))
