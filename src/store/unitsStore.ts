"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Unit } from "@/types/settings"

const INITIAL_UNITS: Unit[] = [
  { id: "1", name: "Unidade", abbreviation: "un" },
  { id: "2", name: "Quilograma", abbreviation: "kg" },
  { id: "3", name: "Metro", abbreviation: "m" },
  { id: "4", name: "Metro Quadrado", abbreviation: "m²" },
  { id: "5", name: "Litro", abbreviation: "l" },
  { id: "6", name: "Caixa", abbreviation: "cx" },
]

export interface UnitInput {
  name: string
  abbreviation: string
}

interface UnitsStore {
  units: Unit[]
  addUnit: (input: UnitInput) => void
  updateUnit: (id: string, input: UnitInput) => void
  removeUnit: (id: string) => void
}

export const useUnitsStore = create<UnitsStore>()(
  persist(
    (set) => ({
      units: INITIAL_UNITS,
      addUnit: (input) =>
        set((state) => ({
          units: [...state.units, { id: String(Date.now()), ...input }],
        })),
      updateUnit: (id, input) =>
        set((state) => ({
          units: state.units.map((u) => (u.id === id ? { ...u, ...input } : u)),
        })),
      removeUnit: (id) =>
        set((state) => ({
          units: state.units.filter((u) => u.id !== id),
        })),
    }),
    { name: "flux-units" }
  )
)
