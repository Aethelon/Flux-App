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
import { INITIAL_PRODUCTS } from "@/data/products"
import { INITIAL_COLUMNS, INITIAL_ORDERS, visibleOrders } from "@/data/orders"
import { INITIAL_HISTORY, entryTotal } from "@/data/history"
import { formatCurrency } from "@/lib/formatters"
import type { Client } from "@/types/client"

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
    description: "Gestão de funcionários",
    href: "/funcionarios",
    icon: UserCog,
    keywords: ["funcionário", "funcionários", "colaborador", "equipe", "time"],
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

// Produtos e clientes abrem a tela já filtrada pelo nome (o `q` alimenta a
// busca da própria tabela). Ordens e compras não têm filtro de busca, então
// levam para a tela onde o item está listado.
function productItems(): SearchItem[] {
  return INITIAL_PRODUCTS.map((p) => ({
    id: `produto-${p.id}`,
    label: p.name,
    description: `${formatCurrency(p.price)} · ${
      p.status === "Esgotado" ? "Esgotado" : `${p.stock} ${p.unit}`
    }`,
    href: `/inventario?q=${encodeURIComponent(p.name)}`,
    icon: Package,
    keywords: [p.category, p.barcode, p.description],
    group: "Produtos",
  }))
}

function clientItems(clients: Client[]): SearchItem[] {
  return clients.map((c) => ({
    id: `cliente-${c.id}`,
    label: c.name,
    description: `${c.status} · ${c.phone}`,
    href: `/clientes?q=${encodeURIComponent(c.name)}`,
    icon: Users,
    keywords: [c.email, c.phone],
    group: "Clientes",
  }))
}

function orderItems(): SearchItem[] {
  return visibleOrders(INITIAL_ORDERS).map((o) => {
    const column = INITIAL_COLUMNS.find((c) => c.id === o.columnId)
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

function historyItems(): SearchItem[] {
  return INITIAL_HISTORY.map((e) => ({
    id: `compra-${e.id}`,
    label: `Nº${e.orderNumber} · ${e.clientName}`,
    description: `${e.date} · ${formatCurrency(entryTotal(e))}`,
    href: "/historico",
    icon: History,
    keywords: [e.clientName, ...e.items.map((i) => i.name)],
    group: "Compras",
  }))
}

// Clientes vêm do store (podem ser cadastrados em tempo real); o resto sai das
// mesmas fontes que alimentam as telas.
export function buildSearchIndex(clients: Client[]): SearchItem[] {
  return [
    ...productItems(),
    ...clientItems(clients),
    ...orderItems(),
    ...historyItems(),
    ...PAGE_ITEMS,
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
