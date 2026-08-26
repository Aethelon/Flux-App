"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { useUserStore } from "@/store/userStore"
import type { AuthUser } from "@/types/auth"
import { api } from "@/lib/api"

export function UserHydrator({ user }: { user: AuthUser }) {
  const setUser = useUserStore((s) => s.setUser)
  const pathname = usePathname()

  useEffect(() => {
    let active = true
    function syncUser() {
      void api.get("auth/me").json<AuthUser>().then((current) => {
        if (active && current.id === user.id) setUser(current)
      }).catch(() => undefined)
    }
    syncUser()
    window.addEventListener("focus", syncUser)
    const interval = window.setInterval(syncUser, 30_000)
    return () => {
      active = false
      window.removeEventListener("focus", syncUser)
      window.clearInterval(interval)
    }
  }, [pathname, setUser, user.id])

  return null
}
