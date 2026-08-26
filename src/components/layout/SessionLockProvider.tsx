"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { Eye, EyeOff, Loader2, LockKeyhole, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import type { AuthUser } from "@/types/auth"
import { useUserStore } from "@/store/userStore"

const STORAGE_KEY = "flux.session-lock"
const LOCK_EVENT = "flux:session-lock-change"
const LOCK_COOKIE = "flux_session_lock"

interface SessionLockContextValue {
  lock: () => void
}

interface SessionLockProviderProps {
  user: AuthUser
  initiallyLocked: boolean
  children: React.ReactNode
}

const SessionLockContext = createContext<SessionLockContextValue | null>(null)

function storedUserId(): string | null {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as unknown
    return typeof value === "object" && value !== null && "userId" in value
      && typeof value.userId === "string" ? value.userId : null
  } catch {
    return null
  }
}

export function SessionLockProvider({ user, initiallyLocked, children }: SessionLockProviderProps) {
  const router = useRouter()
  const logout = useUserStore((state) => state.logout)
  const passwordRef = useRef<HTMLInputElement>(null)
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const subscribe = useCallback((onStoreChange: () => void) => {
    function handleStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY) onStoreChange()
    }
    window.addEventListener("storage", handleStorage)
    window.addEventListener(LOCK_EVENT, onStoreChange)
    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener(LOCK_EVENT, onStoreChange)
    }
  }, [])
  const locked = useSyncExternalStore(
    subscribe,
    () => storedUserId() === user.id,
    () => initiallyLocked,
  )

  const lock = useCallback(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId: user.id }))
    document.cookie = `${LOCK_COOKIE}=${encodeURIComponent(user.id)}; Path=/; SameSite=Strict`
    setPassword("")
    setError("")
    window.dispatchEvent(new Event(LOCK_EVENT))
  }, [user.id])

  useEffect(() => {
    if (locked) passwordRef.current?.focus()
  }, [locked])

  async function handleUnlock(event: React.FormEvent) {
    event.preventDefault()
    if (!password || submitting) return
    setSubmitting(true)
    setError("")
    try {
      const response = await fetch("/api/auth/verify-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { message?: string }
        setError(body.message ?? "Não foi possível desbloquear a sessão.")
        setPassword("")
        return
      }
      window.localStorage.removeItem(STORAGE_KEY)
      document.cookie = `${LOCK_COOKIE}=; Path=/; Max-Age=0; SameSite=Strict`
      window.dispatchEvent(new Event(LOCK_EVENT))
      setPassword("")
    } catch {
      setError("Não foi possível validar a senha.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLogout() {
    window.localStorage.removeItem(STORAGE_KEY)
    document.cookie = `${LOCK_COOKIE}=; Path=/; Max-Age=0; SameSite=Strict`
    window.dispatchEvent(new Event(LOCK_EVENT))
    await fetch("/api/auth/logout", { method: "POST" })
    logout()
    router.push("/login")
  }

  return (
    <SessionLockContext.Provider value={{ lock }}>
      <div className="contents" inert={locked}>
        {children}
      </div>
      {locked && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-(--color-bg) p-6" role="dialog" aria-modal="true" aria-labelledby="session-lock-title">
          <div className="flex w-full max-w-105 flex-col items-center gap-8 rounded-2xl border border-(--color-border) bg-(--color-surface-raised) p-8 shadow-2xl">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-[#5e6ad2]/15 text-[#6f7bf7]">
                <LockKeyhole size={26} />
              </div>
              <div className="text-center">
                <h1 id="session-lock-title" className="text-2xl font-semibold text-(--color-text-primary)">Sessão bloqueada</h1>
                <p className="mt-2 text-sm text-(--color-text-secondary)">{user.name}</p>
                <p className="text-xs text-(--color-text-secondary)">{user.email}</p>
              </div>
              <form className="flex w-full flex-col gap-4" onSubmit={handleUnlock}>
                <div>
                  <label htmlFor="unlock-password" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-(--color-text-secondary)">Senha</label>
                  <div className="relative">
                    <input
                      ref={passwordRef}
                      id="unlock-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                      className="h-11 w-full rounded-lg border border-(--color-border) bg-(--color-bg) px-3 pr-11 text-sm text-(--color-text-primary) outline-none focus:ring-2 focus:ring-[#5e6ad2]/40"
                      placeholder="Digite sua senha"
                    />
                    <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-(--color-text-secondary)" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {error && <p className="mt-2 text-sm text-(--color-text-danger)" role="alert">{error}</p>}
                </div>
                <button type="submit" disabled={!password || submitting} className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#5e6ad2] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  Desbloquear
                </button>
              </form>
              <button type="button" onClick={handleLogout} className="flex items-center gap-2 text-sm text-(--color-text-secondary) hover:text-(--color-text-danger)">
                <LogOut size={15} />
                Sair e trocar de usuário
              </button>
          </div>
        </div>
      )}
    </SessionLockContext.Provider>
  )
}

export function useSessionLock(): SessionLockContextValue {
  const value = useContext(SessionLockContext)
  if (!value) throw new Error("useSessionLock must be used within SessionLockProvider")
  return value
}
