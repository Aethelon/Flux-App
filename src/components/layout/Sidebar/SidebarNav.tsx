"use client"

import {
  LayoutDashboard,
  ShoppingCart,
  Factory,
  Sparkles,
  Archive,
  History,
  Users,
  ShieldCheck,
  Wallet,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { canAccessRoute } from "@/lib/accessControl"
import { useUserStore } from "@/store/userStore"
import { useLocale } from "@/components/layout/LocaleProvider"
import { interfaceCopy } from "@/lib/interfaceCopy"
import { SidebarItem } from "./SidebarItem"

const SECTIONS = [
  {
    label: "operations",
    items: [
      { href: "/dashboard", label: "dashboard", icon: LayoutDashboard },
      { href: "/frente-de-caixa", label: "pointOfSale", icon: ShoppingCart },
      { href: "/ordens", label: "orders", icon: Factory },
    ],
  },
  {
    label: "management",
    items: [
      { href: "/caixa", label: "cash", icon: Wallet },
      { href: "/inteligencia", label: "intelligence", icon: Sparkles },
      { href: "/inventario", label: "inventory", icon: Archive },
      { href: "/historico", label: "history", icon: History },
    ],
  },
  {
    label: "people",
    items: [
      { href: "/clientes", label: "customers", icon: Users },
      { href: "/funcionarios", label: "employees", icon: ShieldCheck },
    ],
  },
] as const

interface SidebarNavProps {
  collapsed: boolean
  onNavigate?: () => void
}

export function SidebarNav({ collapsed, onNavigate }: SidebarNavProps) {
  const user = useUserStore((s) => s.user)
  const { locale } = useLocale()
  const copy = interfaceCopy[locale]
  const visibleSections = SECTIONS
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canAccessRoute(
        user?.role ?? "funcionario",
        item.href,
        user?.permissions,
      )),
    }))
    .filter((section) => section.items.length > 0)

  return (
    <nav aria-label={copy.navigation} className="flex-1 overflow-y-auto px-4 flex flex-col gap-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
      {visibleSections.map((section, i) => (
        <div key={section.label}>
          {i > 0 && (
            <div
              className={cn(
                "overflow-hidden transition-all duration-200",
                collapsed ? "h-2.25 opacity-100" : "h-0 opacity-0"
              )}
            >
              <div className="border-t border-(--color-surface) my-1" />
            </div>
          )}
          <div
            className={cn(
              "overflow-hidden transition-all duration-200",
              collapsed ? "h-0 opacity-0" : "h-7 opacity-100"
            )}
          >
            <div className="h-7 flex items-center">
              <span className="text-[11px] font-semibold text-(--color-text-secondary) font-(family-name:--font-ui) uppercase tracking-[0.8px]">
                {copy[section.label]}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            {section.items.map((item) => (
              <SidebarItem key={item.href} {...item} label={copy[item.label]} collapsed={collapsed} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}
