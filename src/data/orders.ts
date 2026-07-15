import type { KanbanColumn, Order } from "@/types/order"

// Colunas e ordens de serviço — fonte compartilhada entre a tela de Ordens
// (board editável) e o Dashboard (preview do fluxo em modo leitura).
export const INITIAL_COLUMNS: KanbanColumn[] = [
  { id: "pendente",   label: "Pendente",         color: "--color-warning" },
  { id: "andamento",  label: "Em Andamento",     color: "--color-accent" },
  { id: "aguardando", label: "Aguardando Peças", color: "--color-info" },
  { id: "concluido",  label: "Concluído",        color: "--color-success" },
  { id: "cancelado",  label: "Cancelado",        color: "--color-danger" },
]

// Colunas que representam ordens encerradas — tudo que está fora delas conta
// como ordem ativa/em aberto no Dashboard e na Inteligência.
export const CLOSED_COLUMN_IDS = ["concluido", "cancelado"]

// Data de referência do sistema (mock). Com backend, seria a data atual.
const TODAY = new Date("2026-07-14")
const CONCLUDED_VISIBLE_DAYS = 2

// Ordens concluídas há mais de 2 dias saem do quadro/lista (ficam só no
// Histórico) para não poluir o board. As demais permanecem visíveis.
export function isVisibleOrder(order: Order): boolean {
  if (order.columnId !== "concluido" || !order.completedAt) return true
  const days = (TODAY.getTime() - new Date(order.completedAt).getTime()) / 86_400_000
  return days <= CONCLUDED_VISIBLE_DAYS
}

export function visibleOrders(orders: Order[]): Order[] {
  return orders.filter(isVisibleOrder)
}

export const INITIAL_ORDERS: Order[] = [
  { id: "1", columnId: "pendente",  title: "Manutenção de Ar Condicionado", description: "Limpeza completa e recarga de gás do split de 12.000 BTUs.",         client: "Ana Silva",       value: 280, priority: "média", dueAt: "2026-07-15" },
  { id: "2", columnId: "pendente",  title: "Instalação Elétrica",           description: "Instalação de 3 tomadas e 1 disjuntor no quadro da cozinha.",         client: "Bruno Mendes",    value: 350, priority: "alta",  dueAt: "2026-07-16" },
  { id: "3", columnId: "pendente",  title: "Revisão Geral",                 description: "Revisão preventiva de rede hidráulica e elétrica do imóvel.",         client: "Camila Rocha",    value: 180, priority: "baixa", dueAt: "2026-07-18" },
  { id: "4", columnId: "andamento", title: "Montagem de Móveis",            description: "Montagem de guarda-roupa de 6 portas e 2 cômodas.",                   client: "Pedro Alves",     value: 220, priority: "média", dueAt: "2026-07-13" },
  { id: "5", columnId: "andamento", title: "Reparo de Notebook",            description: "Troca de tela e limpeza interna com substituição de pasta térmica.",  client: "Julia Santos",    value: 190, priority: "alta",  dueAt: "2026-07-14" },
  { id: "9", columnId: "aguardando", title: "Conserto de Micro-ondas",      description: "Aguardando a chegada do magnetron encomendado para substituição.",    client: "Rafael Ribeiro",  value: 240, priority: "alta",  dueAt: "2026-07-20" },
  { id: "10", columnId: "aguardando", title: "Troca de Vidro de Janela",    description: "Vidro temperado sob medida encomendado com o fornecedor.",            client: "Camila Rocha",    value: 310, priority: "média", dueAt: "2026-07-22" },
  { id: "6", columnId: "concluido", title: "Pintura Residencial",           description: "Pintura de 2 quartos e sala com massa corrida e 2 demãos.",           client: "Fernanda Costa",  value: 780, priority: "baixa", dueAt: "2026-07-10", completedAt: "2026-07-13" },
  { id: "7", columnId: "concluido", title: "Limpeza Pós-Obra",              description: "Limpeza pesada pós-reforma em apartamento de 80m².",                  client: "Lucas Teixeira",  value: 420, priority: "baixa", dueAt: "2026-07-09", completedAt: "2026-07-09" },
  { id: "8", columnId: "cancelado", title: "Instalação de Rede",            description: "Cabeamento de rede e configuração de roteador (cancelado pelo cliente).", client: "Carlos Oliveira", value: 260, priority: "média", dueAt: "2026-07-08" },
]
