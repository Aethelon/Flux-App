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
    "flex items-center gap-3 px-3 py-2.5 rounded-[4px] transition-colors cursor-pointer",
    "text-[13px] font-semibold text-(--color-text-secondary)",
    "hover:bg-(--color-surface-raised) hover:text-(--color-text-primary)",
    "font-(family-name:--font-ui)"
  )

  return (
    <div className="px-4 pb-4 flex flex-col gap-1">
      <button onClick={onToggle} className={itemCls} title={collapsed ? "Expandir" : "Minimizar UI"}>
        {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        {!collapsed && <span>Minimizar UI</span>}
      </button>

      <Link href="/configuracoes" className={itemCls} title={collapsed ? "Configurações" : undefined}>
        <Settings size={18} />
        {!collapsed && <span>Configurações</span>}
      </Link>

      <button
        onClick={handleLogout}
        className={cn(itemCls, "text-(--color-text-danger) hover:text-(--color-text-danger)")}
        title={collapsed ? "Sair" : undefined}
      >
        <LogOut size={18} />
        {!collapsed && <span>Sair</span>}
      </button>
    </div>
  )
}
