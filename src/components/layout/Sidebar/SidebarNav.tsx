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
import { SidebarItem } from "./SidebarItem"

const SECTIONS = [
  {
    label: "Operacional",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/frente-de-caixa", label: "Frente de Caixa", icon: ShoppingCart },
      { href: "/ordens", label: "Ordens", icon: Factory },
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/caixa", label: "Caixa", icon: Wallet },
      { href: "/inteligencia", label: "Inteligência", icon: Sparkles },
      { href: "/inventario", label: "Inventário", icon: Archive },
      { href: "/historico", label: "Histórico", icon: History },
    ],
  },
  {
    label: "Pessoas",
    items: [
      { href: "/clientes", label: "Clientes", icon: Users },
      { href: "/funcionarios", label: "Funcionários", icon: ShieldCheck },
    ],
  },
]

interface SidebarNavProps {
  collapsed: boolean
}

export function SidebarNav({ collapsed }: SidebarNavProps) {
  const role = useUserStore((s) => s.user?.role ?? "funcionario")

  return (
    <nav className="flex-1 overflow-y-auto px-4 flex flex-col gap-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
      {SECTIONS.map((section, i) => (
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
                {section.label}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            {section.items
              .filter((item) => canAccessRoute(role, item.href))
              .map((item) => (
                <SidebarItem key={item.href} collapsed={collapsed} {...item} />
              ))}
          </div>
        </div>
      ))}
    </nav>
  )
}
