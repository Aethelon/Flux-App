"use client"

import { create } from "zustand"
import { api } from "@/lib/api"
import type { Unit } from "@/types/settings"

export interface UnitInput {
  name: string
  abbreviation: string
}

interface UnitsStore {
  units: Unit[]
  loadUnits: () => Promise<void>
  addUnit: (input: UnitInput) => Promise<void>
  updateUnit: (id: string, input: UnitInput) => Promise<void>
  removeUnit: (id: string) => Promise<void>
}

export const useUnitsStore = create<UnitsStore>((set, get) => ({
  units: [],
  loadUnits: async () => {
    set({ units: await api.get("units").json<Unit[]>() })
  },
  addUnit: async (input) => {
    const created = await api.post("units", {
      json: { ...input, allowsFractional: false, quantityScale: 0 },
    }).json<Unit>()
    set((state) => ({ units: [...state.units, created] }))
  },
  updateUnit: async (id, input) => {
    const current = get().units.find((item) => item.id === id)
    if (!current) return
    const updated = await api.patch(`units/${id}`, {
      json: { version: current.version, ...input },
    }).json<Unit>()
    set((state) => ({
      units: state.units.map((item) => item.id === id ? updated : item),
    }))
  },
  removeUnit: async (id) => {
    const current = get().units.find((item) => item.id === id)
    if (!current) return
    await api.delete(`units/${id}`, {
      searchParams: { version: current.version },
    })
    set((state) => ({
      units: state.units.filter((item) => item.id !== id),
    }))
  },
}))
