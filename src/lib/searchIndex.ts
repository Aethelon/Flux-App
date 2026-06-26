import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  BarChart2,
  Package,
  History,
  Users,
  UserCog,
  Settings,
  type LucideIcon,
} from "lucide-react"

export interface SearchItem {
  label: string
  description?: string
  href: string
  icon: LucideIcon
  keywords: string[]
  category: "Páginas" | "Ações" | "Configurações"
}

export const searchIndex: SearchItem[] = [
  {
    label: "Dashboard",
    description: "Visão geral do sistema",
    href: "/dashboard",
    icon: LayoutDashboard,
    keywords: ["dashboard", "início", "home", "visão geral", "resumo"],
    category: "Páginas",
  },
  {
    label: "Frente de Caixa",
    description: "POS – ponto de venda",
    href: "/frente-de-caixa",
    icon: ShoppingCart,
    keywords: ["caixa", "pdv", "pos", "venda", "frente"],
    category: "Páginas",
  },
  {
    label: "Ordens de Serviço",
    description: "Kanban de ordens",
    href: "/ordens",
    icon: ClipboardList,
    keywords: ["ordens", "serviço", "kanban", "produção", "tarefas"],
    category: "Páginas",
  },
  {
    label: "Inteligência",
    description: "BI, gráficos e projeções",
    href: "/inteligencia",
    icon: BarChart2,
    keywords: ["inteligência", "bi", "gráfico", "relatório", "análise", "projeção"],
    category: "Páginas",
  },
  {
    label: "Inventário",
    description: "Produtos e estoque",
    href: "/inventario",
    icon: Package,
    keywords: ["inventário", "estoque", "produto", "item", "catálogo"],
    category: "Páginas",
  },
  {
    label: "Histórico",
    description: "Histórico de compras e serviços",
    href: "/historico",
    icon: History,
    keywords: ["histórico", "compra", "serviço", "registro", "passado"],
    category: "Páginas",
  },
  {
    label: "Clientes",
    description: "Gestão de clientes",
    href: "/clientes",
    icon: Users,
    keywords: ["cliente", "clientes", "pessoa", "contato"],
    category: "Páginas",
  },
  {
    label: "Funcionários",
    description: "Gestão de funcionários",
    href: "/funcionarios",
    icon: UserCog,
    keywords: ["funcionário", "funcionários", "colaborador", "equipe", "time"],
    category: "Páginas",
  },
  {
    label: "Configurações",
    description: "Configurações da conta",
    href: "/configuracoes",
    icon: Settings,
    keywords: ["configuração", "configurações", "conta", "preferências", "ajustes"],
    category: "Configurações",
  },
]
