"use client"

import { useEffect } from "react"
import { useUserStore } from "@/store/userStore"
import type { AuthUser } from "@/types/auth"

export function UserHydrator({ user }: { user: AuthUser }) {
  const setUser = useUserStore((s) => s.setUser)

  useEffect(() => {
    setUser(user)
  }, [user, setUser])

  return null
}
