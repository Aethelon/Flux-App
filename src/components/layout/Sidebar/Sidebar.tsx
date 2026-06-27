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
        "border-r border-(--color-surface) transition-[width] duration-200",
        collapsed ? "w-19.25" : "w-[256px]"
      )}
    >
      <div
        className={cn(
          "flex items-center pb-6 pt-6 shrink-0 transition-all duration-200",
          collapsed ? "pl-4.5" : "px-6 gap-1"
        )}
      >
        <div className="size-10 rounded-[12px] bg-(--color-accent) flex items-center justify-center shrink-0 shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]">
          <span className="text-[18px] font-black text-white font-(family-name:--font-ui)">F</span>
        </div>
        <div
          className={cn(
            "overflow-hidden transition-all duration-200",
            collapsed ? "max-w-0 opacity-0" : "max-w-50 opacity-100"
          )}
        >
          <div className="flex flex-col pl-2.5 whitespace-nowrap">
            <span className="text-[20px] font-black text-(--color-text-primary) font-(family-name:--font-ui) leading-none">
              Flux
            </span>
            <span className="text-[12px] font-medium text-(--color-text-secondary) font-(family-name:--font-ui) leading-4">
              Varejo &amp; Produção
            </span>
          </div>
        </div>
      </div>

      <SidebarNav collapsed={collapsed} />
      <SidebarFooter collapsed={collapsed} onToggle={toggle} />
    </aside>
  )
}
