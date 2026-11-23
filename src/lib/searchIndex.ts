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
  Wallet,
  type LucideIcon,
} from "lucide-react"
import type { HistorySearchRecord } from "@/store/historyStore"
import { formatCurrency, phoneDigits } from "@/lib/formatters"
import { interfaceCopy } from "@/lib/interfaceCopy"
import { DEFAULT_LOCALE, type Locale } from "@/lib/locale"
import type { Client } from "@/types/client"
import type { Product } from "@/types/product"
import type { KanbanColumn, Order } from "@/types/order"

export type SearchGroup =
  | "Produtos"
  | "Clientes"
  | "Ordens de Serviço"
  | "Compras"
  | "Páginas"

export interface SearchItem {
  id: string
  label: string
  description?: string
  href: string
  icon: LucideIcon
  keywords: string[]
  group: SearchGroup
}

// Ordem dos grupos no dropdown: primeiro o conteúdo das telas, e as páginas
// por último (elas já estão sempre à mão na sidebar).
const GROUP_ORDER: SearchGroup[] = [
  "Produtos",
  "Clientes",
  "Ordens de Serviço",
  "Compras",
  "Páginas",
]

const PAGE_ITEMS: SearchItem[] = [
  {
    id: "pagina-dashboard",
    label: "Dashboard",
    description: "Visão geral do sistema",
    href: "/dashboard",
    icon: LayoutDashboard,
    keywords: ["dashboard", "início", "home", "visão geral", "resumo"],
    group: "Páginas",
  },
  {
    id: "pagina-frente-de-caixa",
    label: "Frente de Caixa",
    description: "POS – ponto de venda",
    href: "/frente-de-caixa",
    icon: ShoppingCart,
    keywords: ["caixa", "pdv", "pos", "venda", "frente"],
    group: "Páginas",
  },
  {
    id: "pagina-caixa",
    label: "Caixa",
    description: "Abertura, fechamento e movimentações",
    href: "/caixa",
    icon: Wallet,
    keywords: ["caixa", "sangria", "suprimento", "movimentação", "abertura", "fechamento", "turno"],
    group: "Páginas",
  },
  {
    id: "pagina-ordens",
    label: "Ordens de Serviço",
    description: "Kanban de ordens",
    href: "/ordens",
    icon: ClipboardList,
    keywords: ["ordens", "serviço", "kanban", "produção", "tarefas"],
    group: "Páginas",
  },
  {
    id: "pagina-inteligencia",
    label: "Inteligência",
    description: "BI, gráficos e projeções",
    href: "/inteligencia",
    icon: BarChart2,
    keywords: ["inteligência", "bi", "gráfico", "relatório", "análise", "projeção"],
    group: "Páginas",
  },
  {
    id: "pagina-inventario",
    label: "Inventário",
    description: "Produtos e estoque",
    href: "/inventario",
    icon: Package,
    keywords: ["inventário", "estoque", "produto", "item", "catálogo"],
    group: "Páginas",
  },
  {
    id: "pagina-historico",
    label: "Histórico",
    description: "Histórico de compras e serviços",
    href: "/historico",
    icon: History,
    keywords: ["histórico", "compra", "serviço", "registro", "passado"],
    group: "Páginas",
  },
  {
    id: "pagina-clientes",
    label: "Clientes",
    description: "Gestão de clientes",
    href: "/clientes",
    icon: Users,
    keywords: ["cliente", "clientes", "pessoa", "contato"],
    group: "Páginas",
  },
  {
    id: "pagina-funcionarios",
    label: "Funcionários",
    description: "Gestão de funcionários e perfis de acesso",
    href: "/funcionarios",
    icon: UserCog,
    keywords: [
      "usuário",
      "usuários",
      "operador",
      "operadores",
      "funcionário",
      "funcionários",
      "colaborador",
      "equipe",
      "time",
    ],
    group: "Páginas",
  },
  {
    id: "pagina-configuracoes",
    label: "Configurações",
    description: "Configurações da conta",
    href: "/configuracoes",
    icon: Settings,
    keywords: ["configuração", "configurações", "conta", "preferências", "ajustes"],
    group: "Páginas",
  },
]

const pageTranslations = {
  "/dashboard": ["dashboard", "System overview", "Vista general del sistema"],
  "/frente-de-caixa": ["pointOfSale", "Sales and payments", "Ventas y pagos"],
  "/caixa": ["cash", "Register sessions and movements", "Sesiones y movimientos de caja"],
  "/ordens": ["orders", "Service order board", "Tablero de órdenes de servicio"],
  "/inteligencia": ["intelligence", "Reports, charts and forecasts", "Informes, gráficos y proyecciones"],
  "/inventario": ["inventory", "Products and stock", "Productos e inventario"],
  "/historico": ["history", "Sales and service history", "Historial de ventas y servicios"],
  "/clientes": ["customers", "Customer management", "Gestión de clientes"],
  "/funcionarios": ["employees", "Employees and access roles", "Empleados y perfiles de acceso"],
  "/configuracoes": ["settings", "Account settings", "Configuración de la cuenta"],
} as const

// Produtos e clientes abrem a tela já filtrada pelo nome (o `q` alimenta a
// busca da própria tabela). Ordens e compras não têm filtro de busca, então
// levam para a tela onde o item está listado.
function productItems(products: Product[], locale: Locale): SearchItem[] {
  return products.map((p) => ({
    id: `produto-${p.id}`,
    label: p.name,
    description: `${formatCurrency(p.price)} · ${
      p.status === "Esgotado" ? interfaceCopy[locale].statuses.Esgotado : `${p.stock} ${p.unit}`
    }`,
    href: `/inventario?q=${encodeURIComponent(p.name)}`,
    icon: Package,
    keywords: [p.category, p.barcode, p.description],
    group: "Produtos",
  }))
}

function clientItems(clients: Client[], locale: Locale): SearchItem[] {
  return clients.map((c) => ({
    id: `cliente-${c.id}`,
    label: c.name,
    description: `${interfaceCopy[locale].statuses[c.status]} · ${c.phone}`,
    href: `/clientes?q=${encodeURIComponent(c.name)}`,
    icon: Users,
    keywords: [c.email, c.phone, phoneDigits(c.phone)],
    group: "Clientes",
  }))
}

function orderItems(orders: Order[], columns: KanbanColumn[]): SearchItem[] {
  return orders.map((o) => {
    const column = columns.find((c) => c.id === o.columnId)
    return {
      id: `ordem-${o.id}`,
      label: o.title,
      description: `${o.client} · ${column?.label ?? o.columnId}`,
      href: "/ordens",
      icon: ClipboardList,
      keywords: [o.client, o.description],
      group: "Ordens de Serviço",
    }
  })
}

function historyItems(history: HistorySearchRecord[], locale: Locale): SearchItem[] {
  return history.map((e) => {
    const customer = e.customerName ?? interfaceCopy[locale].anonymousCustomer
    return {
      id: `compra-${e.id}`,
      label: `#${e.businessNumber} · ${customer}`,
      description: new Date(e.completedAt).toLocaleDateString(locale),
      href: "/historico",
      icon: History,
      keywords: [customer, ...e.itemNames],
      group: "Compras",
    }
  })
}

// Clientes vêm do store (podem ser cadastrados em tempo real); o resto sai das
// mesmas fontes que alimentam as telas.
export function buildSearchIndex(
  clients: Client[],
  products: Product[],
  orders: Order[],
  columns: KanbanColumn[],
  history: HistorySearchRecord[],
  locale: Locale = DEFAULT_LOCALE,
): SearchItem[] {
  const pages = locale === DEFAULT_LOCALE ? PAGE_ITEMS : PAGE_ITEMS.map((item) => {
    const translation = pageTranslations[item.href as keyof typeof pageTranslations]
    if (!translation) return item
    const [label, english, spanish] = translation
    const description = locale === "es" ? spanish : english
    return { ...item, label: interfaceCopy[locale][label], description, keywords: [...item.keywords, description] }
  })
  return [
    ...productItems(products, locale),
    ...clientItems(clients, locale),
    ...orderItems(orders, columns),
    ...historyItems(history, locale),
    ...pages,
  ]
}

// Busca sem acento e sem caixa: "cafe" encontra "Café".
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

export interface SearchResultGroup {
  group: SearchGroup
  items: SearchItem[]
}

// Casa o termo contra o rótulo e as palavras-chave, e limita cada grupo para o
// dropdown não crescer demais quando a busca é genérica.
export function searchItems(
  items: SearchItem[],
  query: string,
  perGroup = 5
): SearchResultGroup[] {
  const term = normalize(query.trim())
  if (!term) return []

  const matches = items.filter((item) =>
    normalize([item.label, ...item.keywords].join(" ")).includes(term)
  )

  return GROUP_ORDER.map((group) => ({
    group,
    items: matches.filter((item) => item.group === group).slice(0, perGroup),
  })).filter((g) => g.items.length > 0)
}
