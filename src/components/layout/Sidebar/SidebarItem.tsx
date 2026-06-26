"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface SidebarItemProps {
  href: string
  label: string
  icon: LucideIcon
  collapsed: boolean
}

export function SidebarItem({ href, label, icon: Icon, collapsed }: SidebarItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + "/")

  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        "flex items-center gap-[var(--sidebar-item-gap,12px)] px-3 py-2.5 rounded-[4px] transition-colors",
        "text-[14px] font-semibold tracking-[2.4px] uppercase",
        "font-(family-name:--font-ui)",
        isActive
          ? "bg-(--color-accent)/15 text-(--color-text-primary)"
          : "text-(--color-text-secondary) hover:bg-(--color-surface-raised) hover:text-(--color-text-primary)"
      )}
    >
      <Icon
        size={18}
        className={cn(
          "shrink-0",
          isActive ? "text-(--color-accent)" : "text-current"
        )}
      />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  )
}
