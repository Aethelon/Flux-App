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
        "flex items-center gap-2 px-2.5 py-1.75 rounded-xs transition-colors",
        "text-[13px] font-semibold tracking-[0.2px]",
        "font-(family-name:--font-ui) text-(--color-text-primary)",
        isActive ? "bg-(--color-surface)" : "hover:bg-(--color-surface-raised)"
      )}
    >
      <Icon size={16} className="shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  )
}
