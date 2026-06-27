"use client"

import { Settings, LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useUserStore } from "@/store/userStore"

interface SidebarFooterProps {
  collapsed: boolean
  onToggle: () => void
}

export function SidebarFooter({ collapsed, onToggle }: SidebarFooterProps) {
  const router = useRouter()
  const logout = useUserStore((s) => s.logout)

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    logout()
    router.push("/login")
  }

  const itemCls = cn(
    "flex items-center py-[7px] rounded-[4px] transition-all duration-200 cursor-pointer w-full overflow-hidden",
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
      <button onClick={onToggle} className={itemCls} title={collapsed ? "Expandir" : undefined}>
        {collapsed ? <PanelLeftOpen size={16} className="shrink-0" /> : <PanelLeftClose size={16} className="shrink-0" />}
        <span className={labelCls}>Minimizar UI</span>
      </button>

      <Link href="/configuracoes" className={itemCls} title={collapsed ? "Configurações" : undefined}>
        <Settings size={16} className="shrink-0" />
        <span className={labelCls}>Configurações</span>
      </Link>

      <button
        onClick={handleLogout}
        className={cn(itemCls, "text-(--color-text-danger) hover:text-(--color-text-danger)")}
        title={collapsed ? "Sair" : undefined}
      >
        <LogOut size={16} className="shrink-0" />
        <span className={labelCls}>Sair</span>
      </button>
    </div>
  )
}
