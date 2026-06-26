"use client"

import { cn } from "@/lib/utils"
import { useSidebarStore } from "@/store/sidebarStore"
import { SidebarNav } from "./SidebarNav"
import { SidebarFooter } from "./SidebarFooter"

export function Sidebar() {
  const { collapsed, toggle } = useSidebarStore()

  return (
    <aside
      className={cn(
        "flex flex-col h-screen shrink-0 bg-(--color-bg)",
        "border-r border-(--color-border) transition-[width] duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className={cn("flex items-center h-[74px] border-b border-(--color-border)", collapsed ? "px-4 justify-center" : "px-6")}>
        {collapsed ? (
          <span
            className="text-[20px] font-black text-(--color-text-primary) font-(family-name:--font-ui)"
            style={{ boxShadow: "var(--shadow-logo)" }}
          >
            F
          </span>
        ) : (
          <div className="flex flex-col leading-none">
            <span
              className="text-[20px] font-black text-(--color-text-primary) font-(family-name:--font-ui)"
              style={{ boxShadow: "var(--shadow-logo)" }}
            >
              Flux
            </span>
            <span className="text-[12px] font-medium text-(--color-text-secondary) font-(family-name:--font-ui)">
              Varejo &amp; Produção
            </span>
          </div>
        )}
      </div>

      <SidebarNav collapsed={collapsed} />
      <SidebarFooter collapsed={collapsed} onToggle={toggle} />
    </aside>
  )
}
