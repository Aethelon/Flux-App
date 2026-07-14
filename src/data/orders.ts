import type { KanbanColumn, Order } from "@/types/order"

// Colunas e ordens de serviço — fonte compartilhada entre a tela de Ordens
// (board editável) e o Dashboard (preview do fluxo em modo leitura).
export const INITIAL_COLUMNS: KanbanColumn[] = [
  { id: "pendente",  label: "Pendente",      color: "--color-warning" },
  { id: "andamento", label: "Em Andamento",  color: "--color-accent" },
  { id: "concluido", label: "Concluído",     color: "--color-success" },
  { id: "cancelado", label: "Cancelado",     color: "--color-danger" },
]

export const INITIAL_ORDERS: Order[] = [
  { id: "1", columnId: "pendente",  title: "Manutenção de Ar Condicionado", description: "Limpeza completa e recarga de gás do split de 12.000 BTUs.",         client: "Ana Silva",       value: 280, priority: "média", dueAt: "2026-07-15" },
  { id: "2", columnId: "pendente",  title: "Instalação Elétrica",           description: "Instalação de 3 tomadas e 1 disjuntor no quadro da cozinha.",         client: "Bruno Mendes",    value: 350, priority: "alta",  dueAt: "2026-07-16" },
  { id: "3", columnId: "pendente",  title: "Revisão Geral",                 description: "Revisão preventiva de rede hidráulica e elétrica do imóvel.",         client: "Camila Rocha",    value: 180, priority: "baixa", dueAt: "2026-07-18" },
  { id: "4", columnId: "andamento", title: "Montagem de Móveis",            description: "Montagem de guarda-roupa de 6 portas e 2 cômodas.",                   client: "Pedro Alves",     value: 220, priority: "média", dueAt: "2026-07-13" },
  { id: "5", columnId: "andamento", title: "Reparo de Notebook",            description: "Troca de tela e limpeza interna com substituição de pasta térmica.",  client: "Julia Santos",    value: 190, priority: "alta",  dueAt: "2026-07-14" },
  { id: "6", columnId: "concluido", title: "Pintura Residencial",           description: "Pintura de 2 quartos e sala com massa corrida e 2 demãos.",           client: "Fernanda Costa",  value: 780, priority: "baixa", dueAt: "2026-07-10" },
  { id: "7", columnId: "concluido", title: "Limpeza Pós-Obra",              description: "Limpeza pesada pós-reforma em apartamento de 80m².",                  client: "Lucas Teixeira",  value: 420, priority: "baixa", dueAt: "2026-07-09" },
  { id: "8", columnId: "cancelado", title: "Instalação de Rede",            description: "Cabeamento de rede e configuração de roteador (cancelado pelo cliente).", client: "Carlos Oliveira", value: 260, priority: "média", dueAt: "2026-07-08" },
]
