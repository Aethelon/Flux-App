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
        "flex items-center py-1.75 rounded-xs transition-all duration-200 w-full overflow-hidden",
        collapsed ? "pl-3.5" : "gap-2 px-2.5",
        "text-[13px] font-semibold tracking-[0.2px]",
        "font-(family-name:--font-ui) text-(--color-text-primary)",
        isActive ? "bg-(--color-surface)" : "hover:bg-(--color-surface-raised)"
      )}
    >
      <Icon size={16} className="shrink-0" />
      <span
        className={cn(
          "truncate whitespace-nowrap transition-all duration-200 overflow-hidden",
          collapsed ? "max-w-0 opacity-0" : "max-w-xs opacity-100"
        )}
      >
        {label}
      </span>
    </Link>
  )
}
