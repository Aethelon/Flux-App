"use client"

import { create } from "zustand"
import type { AuthUser } from "@/types/auth"

interface UserStore {
  user: AuthUser | null
  setUser: (u: AuthUser) => void
  logout: () => void
}

export const useUserStore = create<UserStore>()((set) => ({
  user: null,
  setUser: (u) => set({ user: u }),
  logout: () => set({ user: null }),
}))
