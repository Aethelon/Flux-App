"use client"

import { LockKeyhole, Settings, LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useUserStore } from "@/store/userStore"
import { useSessionLock } from "@/components/layout/SessionLockProvider"
import { useLocale } from "@/components/layout/LocaleProvider"
import { interfaceCopy } from "@/lib/interfaceCopy"

interface SidebarFooterProps {
  collapsed: boolean
  onToggle?: () => void
  onNavigate?: () => void
}

export function SidebarFooter({ collapsed, onToggle, onNavigate }: SidebarFooterProps) {
  const router = useRouter()
  const logout = useUserStore((s) => s.logout)
  const { lock } = useSessionLock()
  const { locale } = useLocale()
  const copy = interfaceCopy[locale]

  async function handleLogout() {
    onNavigate?.()
    await fetch("/api/auth/logout", { method: "POST" })
    logout()
    router.push("/login")
  }

  const itemCls = cn(
    "flex min-h-11 items-center py-[7px] rounded-[4px] transition-all duration-200 cursor-pointer w-full overflow-hidden lg:min-h-0",
    collapsed ? "pl-3.5" : "gap-[8px] px-[10px]",
    "text-[13px] font-semibold tracking-[0.2px] text-(--color-text-primary)",
    "hover:bg-(--color-surface-raised)",
    "font-(family-name:--font-ui)"
  )

  const labelCls = cn(
    "whitespace-nowrap transition-all duration-200 overflow-hidden",
    collapsed ? "max-w-0 opacity-0" : "max-w-[160px] opacity-100"
  )

  return (
    <div className="border-t border-(--color-surface) pt-4 px-4 pb-4 flex flex-col gap-0.5 shrink-0">
      {onToggle && (
        <button onClick={onToggle} className={itemCls} aria-label={collapsed ? copy.expand : copy.collapse} title={collapsed ? copy.expand : undefined}>
          {collapsed ? <PanelLeftOpen size={16} className="shrink-0" /> : <PanelLeftClose size={16} className="shrink-0" />}
          <span className={labelCls}>{copy.collapse}</span>
        </button>
      )}

      <Link href="/configuracoes" onNavigate={onNavigate} className={itemCls} title={collapsed ? copy.settings : undefined}>
        <Settings size={16} className="shrink-0" />
        <span className={labelCls}>{copy.settings}</span>
      </Link>

      <button onClick={() => { onNavigate?.(); lock() }} className={itemCls} title={collapsed ? copy.lock : undefined}>
        <LockKeyhole size={16} className="shrink-0" />
        <span className={labelCls}>{copy.lock}</span>
      </button>

      <button
        onClick={handleLogout}
        className={cn(itemCls, "text-(--color-text-danger) hover:text-(--color-text-danger)")}
        title={collapsed ? copy.logout : undefined}
      >
        <LogOut size={16} className="shrink-0" />
        <span className={labelCls}>{copy.logout}</span>
      </button>
    </div>
  )
}
