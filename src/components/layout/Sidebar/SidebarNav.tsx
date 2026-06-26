import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  BarChart2,
  Package,
  History,
  Users,
  UserCog,
} from "lucide-react"
import { SidebarItem } from "./SidebarItem"

const SECTIONS = [
  {
    label: "Operacional",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/frente-de-caixa", label: "Frente de Caixa", icon: ShoppingCart },
      { href: "/ordens", label: "Ordens", icon: ClipboardList },
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/inteligencia", label: "Inteligência", icon: BarChart2 },
      { href: "/inventario", label: "Inventário", icon: Package },
      { href: "/historico", label: "Histórico", icon: History },
    ],
  },
  {
    label: "Pessoas",
    items: [
      { href: "/clientes", label: "Clientes", icon: Users },
      { href: "/funcionarios", label: "Funcionários", icon: UserCog },
    ],
  },
]

interface SidebarNavProps {
  collapsed: boolean
}

export function SidebarNav({ collapsed }: SidebarNavProps) {
  return (
    <nav className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-5">
      {SECTIONS.map((section) => (
        <div key={section.label} className="flex flex-col gap-1">
          {!collapsed && (
            <span className="px-3 mb-1 text-[12px] font-medium text-(--color-text-secondary) font-(family-name:--font-ui)">
              {section.label}
            </span>
          )}
          {section.items.map((item) => (
            <SidebarItem key={item.href} collapsed={collapsed} {...item} />
          ))}
        </div>
      ))}
    </nav>
  )
}
